import { inflateRawSync } from "node:zlib";

import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

import {
  normalizeAndValidateExtractedText,
  ResumeExtractionError,
  type SupportedResumeFileType,
} from "@/lib/resume/resumeUploadContract";

// These ceilings keep Mammoth's second extraction pass bounded while allowing
// a 4 MiB resume to contain ordinary compressed Office XML and image assets.
const DOCX_LIMITS = {
  maxEntries: 256,
  maxEntryExpandedBytes: 4 * 1024 * 1024,
  maxTotalExpandedBytes: 12 * 1024 * 1024,
  maxCompressionRatio: 100,
  maxEntryNameBytes: 512,
} as const;

const ZIP_SIGNATURES = {
  localFile: 0x04034b50,
  centralFile: 0x02014b50,
  endOfCentralDirectory: 0x06054b50,
} as const;

const WORDPROCESSINGML_NAMESPACES = new Set([
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  "http://purl.oclc.org/ooxml/wordprocessingml/main",
]);

const OFFICE_DOCUMENT_RELATIONSHIP_TYPES = [
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
  "http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument",
] as const;

const MAX_ROOT_START_TAG_CHARACTERS = 16 * 1024;

type ZipEntry = {
  name: string;
  nameBytes: Buffer;
  versionNeeded: number;
  flags: number;
  compressionMethod: number;
  crc32: number;
  compressedSize: number;
  expandedSize: number;
  localHeaderOffset: number;
};

type PreparedZipEntry = ZipEntry & {
  dataOffset: number;
  dataEnd: number;
  recordEnd: number;
};

type ZipDirectory = {
  entries: ZipEntry[];
  centralOffset: number;
};

export async function extractResumeTextFromBuffer(
  buffer: Buffer,
  fileType: SupportedResumeFileType,
): Promise<string> {
  if (fileType === "txt") {
    return extractTxtText(buffer);
  }

  if (fileType === "pdf") {
    if (!hasPdfSignature(buffer)) {
      throw new ResumeExtractionError("mime_signature_mismatch");
    }
    return extractPdfText(buffer);
  }

  if (
    buffer.length < 4 ||
    buffer.readUInt32LE(0) !== ZIP_SIGNATURES.localFile
  ) {
    throw new ResumeExtractionError("mime_signature_mismatch");
  }
  return extractDocxText(buffer);
}

function extractTxtText(buffer: Buffer): string {
  let text: string;

  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new ResumeExtractionError("mime_signature_mismatch");
  }

  const prohibitedControls = text.match(
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu,
  );
  if (prohibitedControls?.length) {
    throw new ResumeExtractionError("mime_signature_mismatch");
  }

  return normalizeAndValidateExtractedText(text);
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  validatePdfStructure(buffer);

  try {
    const result = await pdfParse(buffer);
    const rawText = result.text ?? "";
    const hasImageContent =
      /\/Subtype\s*\/Image\b|\/Image\b/.test(
        buffer.toString("latin1"),
      );

    return classifyPdfExtractedText(rawText, hasImageContent);
  } catch (error) {
    if (error instanceof ResumeExtractionError) {
      throw error;
    }

    throw new ResumeExtractionError("malformed_pdf");
  }
}

export function classifyPdfExtractedText(
  rawText: string,
  hasImageContent: boolean,
): string {
  if (
    !rawText.trim() ||
    (rawText.trim().length < 20 && hasImageContent)
  ) {
    throw new ResumeExtractionError(
      hasImageContent
        ? "scanned_pdf_unsupported"
        : "empty_document",
    );
  }

  return normalizeAndValidateExtractedText(rawText);
}

function validatePdfStructure(buffer: Buffer): void {
  const suffix = buffer.subarray(Math.max(0, buffer.length - 1024))
    .toString("latin1");

  if (
    buffer.length < 32 ||
    !hasPdfSignature(buffer) ||
    !/%%EOF[\u0009\u000a\u000d\u0020]*$/.test(suffix)
  ) {
    throw new ResumeExtractionError("malformed_pdf");
  }
}

function hasPdfSignature(buffer: Buffer): boolean {
  const prefix = buffer.subarray(0, Math.min(buffer.length, 1024))
    .toString("latin1");
  return /^[\u0009\u000a\u000d\u0020]*%PDF-1\.[0-7]\b/.test(
    prefix,
  );
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    inspectDocxArchive(buffer);
    const result = await mammoth.extractRawText({ buffer });
    return normalizeAndValidateExtractedText(result.value ?? "");
  } catch (error) {
    if (
      error instanceof ResumeExtractionError &&
      (error.code === "empty_document" ||
        error.code === "excessive_extracted_text")
    ) {
      throw error;
    }

    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }
}

export function inspectDocxArchive(buffer: Buffer): void {
  const { entries, centralOffset } = readCentralDirectory(buffer);
  const preparedEntries = entries.map((entry) =>
    prepareLocalEntry(buffer, entry, centralOffset)
  );
  validateLocalEntryRanges(preparedEntries, centralOffset);

  const expandedEntries = new Map<string, Buffer>();
  let totalExpandedBytes = 0;

  for (const entry of preparedEntries) {
    const expanded = expandEntry(buffer, entry);
    totalExpandedBytes += expanded.byteLength;
    if (totalExpandedBytes > DOCX_LIMITS.maxTotalExpandedBytes) {
      throw new ResumeExtractionError("malformed_or_unsafe_docx");
    }
    expandedEntries.set(entry.name, expanded);
  }

  const contentTypes = requiredXml(
    expandedEntries,
    "[Content_Types].xml",
  );
  const packageRelationships = requiredXml(
    expandedEntries,
    "_rels/.rels",
  );
  const documentXml = requiredXml(
    expandedEntries,
    "word/document.xml",
  );

  if (
    !contentTypes.includes(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
    ) ||
    !/PartName=["']\/word\/document\.xml["']/u.test(contentTypes) ||
    !OFFICE_DOCUMENT_RELATIONSHIP_TYPES.some((relationshipType) =>
      packageRelationships.includes(relationshipType)
    ) ||
    !/Target=["']\/?word\/document\.xml["']/u.test(
      packageRelationships,
    )
  ) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }

  validateWordDocumentRoot(documentXml);
}

function readCentralDirectory(buffer: Buffer): ZipDirectory {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  if (eocdOffset < 0 || eocdOffset + 22 > buffer.length) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }

  const diskNumber = buffer.readUInt16LE(eocdOffset + 4);
  const centralDisk = buffer.readUInt16LE(eocdOffset + 6);
  const entriesOnDisk = buffer.readUInt16LE(eocdOffset + 8);
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralSize = buffer.readUInt32LE(eocdOffset + 12);
  const centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  const commentLength = buffer.readUInt16LE(eocdOffset + 20);

  if (
    diskNumber !== 0 ||
    centralDisk !== 0 ||
    entriesOnDisk !== entryCount ||
    entryCount === 0 ||
    entryCount > DOCX_LIMITS.maxEntries ||
    entryCount === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff ||
    eocdOffset + 22 + commentLength !== buffer.length ||
    centralOffset + centralSize !== eocdOffset
  ) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }

  const entries: ZipEntry[] = [];
  const normalizedNames = new Set<string>();
  let cursor = centralOffset;
  let totalExpandedBytes = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (
      cursor + 46 > eocdOffset ||
      buffer.readUInt32LE(cursor) !== ZIP_SIGNATURES.centralFile
    ) {
      throw new ResumeExtractionError("malformed_or_unsafe_docx");
    }

    const versionNeeded = buffer.readUInt16LE(cursor + 6);
    const flags = buffer.readUInt16LE(cursor + 8);
    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const crc32 = buffer.readUInt32LE(cursor + 16);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const expandedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const fileCommentLength = buffer.readUInt16LE(cursor + 32);
    const diskStart = buffer.readUInt16LE(cursor + 34);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const entryEnd = checkedEnd(
      cursor,
      46 + nameLength + extraLength + fileCommentLength,
      eocdOffset,
    );

    if (
      nameLength === 0 ||
      nameLength > DOCX_LIMITS.maxEntryNameBytes ||
      extraLength !== 0 ||
      diskStart !== 0 ||
      ![0, 8].includes(compressionMethod) ||
      !hasAllowedZipFlags(flags, compressionMethod) ||
      !hasSupportedZipVersion(
        versionNeeded,
        compressionMethod,
        flags,
      ) ||
      [compressedSize, expandedSize, localHeaderOffset].includes(
        0xffffffff,
      ) ||
      (compressionMethod === 0 &&
        compressedSize !== expandedSize) ||
      expandedSize > DOCX_LIMITS.maxEntryExpandedBytes ||
      (expandedSize > 0 &&
        (compressedSize === 0 ||
          expandedSize / compressedSize >
            DOCX_LIMITS.maxCompressionRatio))
    ) {
      throw new ResumeExtractionError("malformed_or_unsafe_docx");
    }

    const nameBytes = buffer.subarray(
      cursor + 46,
      cursor + 46 + nameLength,
    );
    const name = decodeZipEntryName(nameBytes, flags);
    validateZipEntryName(name);
    const normalizedName = name.toLocaleLowerCase("en-US");

    if (normalizedNames.has(normalizedName)) {
      throw new ResumeExtractionError("malformed_or_unsafe_docx");
    }

    normalizedNames.add(normalizedName);
    totalExpandedBytes += expandedSize;
    if (totalExpandedBytes > DOCX_LIMITS.maxTotalExpandedBytes) {
      throw new ResumeExtractionError("malformed_or_unsafe_docx");
    }

    entries.push({
      name,
      nameBytes: Buffer.from(nameBytes),
      versionNeeded,
      flags,
      compressionMethod,
      crc32,
      compressedSize,
      expandedSize,
      localHeaderOffset,
    });
    cursor = entryEnd;
  }

  if (cursor !== eocdOffset) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }

  return { entries, centralOffset };
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minimumOffset = Math.max(0, buffer.length - 65_557);
  for (let cursor = buffer.length - 22; cursor >= minimumOffset; cursor -= 1) {
    if (
      cursor >= 0 &&
      buffer.readUInt32LE(cursor) ===
        ZIP_SIGNATURES.endOfCentralDirectory
    ) {
      return cursor;
    }
  }
  return -1;
}

function decodeZipEntryName(
  bytes: Buffer,
  flags: number,
): string {
  if ((flags & 0x0800) === 0 && bytes.some((byte) => byte > 0x7f)) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }
}

function validateZipEntryName(name: string): void {
  const segments = name.split("/");
  const nonEmptySegments = segments.filter(Boolean);

  if (
    !name ||
    name.startsWith("/") ||
    name.startsWith("\\") ||
    /^[a-z]:/iu.test(name) ||
    name.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(name) ||
    nonEmptySegments.some(
      (segment) => segment === "." || segment === "..",
    ) ||
    nonEmptySegments.length === 0
  ) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }
}

function hasAllowedZipFlags(
  flags: number,
  compressionMethod: number,
): boolean {
  // Bit 3 is supported only through the exact descriptor parser below.
  // Bits 1-2 are deflate level hints and are meaningless for stored data.
  const allowedFlags = compressionMethod === 8 ? 0x080e : 0x0808;
  return (flags & ~allowedFlags) === 0;
}

function hasSupportedZipVersion(
  versionNeeded: number,
  compressionMethod: number,
  flags: number,
): boolean {
  // The installed Word/Mammoth fixtures use FAT (0) or Unix (3)
  // compatibility with ZIP 1.0 for stored entries and ZIP 2.0 for
  // Deflate/descriptors. Later feature levels are outside this policy.
  const compatibilitySystem = versionNeeded >>> 8;
  const extractorVersion = versionNeeded & 0xff;
  if (![0, 3].includes(compatibilitySystem)) {
    return false;
  }
  if (compressionMethod === 8 && extractorVersion !== 20) {
    return false;
  }
  if (
    compressionMethod === 0 &&
    ![10, 20].includes(extractorVersion)
  ) {
    return false;
  }
  return (flags & 0x0008) === 0 || extractorVersion === 20;
}

function prepareLocalEntry(
  buffer: Buffer,
  entry: ZipEntry,
  centralOffset: number,
): PreparedZipEntry {
  const offset = entry.localHeaderOffset;
  if (
    checkedEnd(offset, 30, centralOffset) > centralOffset ||
    buffer.readUInt32LE(offset) !== ZIP_SIGNATURES.localFile
  ) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }

  const localVersionNeeded = buffer.readUInt16LE(offset + 4);
  const localFlags = buffer.readUInt16LE(offset + 6);
  const localMethod = buffer.readUInt16LE(offset + 8);
  const localCrc32 = buffer.readUInt32LE(offset + 14);
  const localCompressedSize = buffer.readUInt32LE(offset + 18);
  const localExpandedSize = buffer.readUInt32LE(offset + 22);
  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const nameOffset = checkedEnd(offset, 30, centralOffset);
  const extraOffset = checkedEnd(
    nameOffset,
    nameLength,
    centralOffset,
  );
  const dataOffset = checkedEnd(
    extraOffset,
    extraLength,
    centralOffset,
  );
  const dataEnd = checkedEnd(
    dataOffset,
    entry.compressedSize,
    centralOffset,
  );

  if (
    nameLength === 0 ||
    nameLength > DOCX_LIMITS.maxEntryNameBytes ||
    localVersionNeeded !== entry.versionNeeded ||
    localFlags !== entry.flags ||
    localMethod !== entry.compressionMethod ||
    !buffer
      .subarray(nameOffset, extraOffset)
      .equals(entry.nameBytes)
  ) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }

  validateLocalExtraFields(buffer.subarray(extraOffset, dataOffset));

  let recordEnd = dataEnd;
  if ((entry.flags & 0x0008) !== 0) {
    if (
      localCrc32 !== 0 ||
      localCompressedSize !== 0 ||
      localExpandedSize !== 0
    ) {
      throw new ResumeExtractionError("malformed_or_unsafe_docx");
    }
    recordEnd = validateDataDescriptor(
      buffer,
      dataEnd,
      centralOffset,
      entry,
    );
  } else if (
    localCrc32 !== entry.crc32 ||
    localCompressedSize !== entry.compressedSize ||
    localExpandedSize !== entry.expandedSize
  ) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }

  return {
    ...entry,
    dataOffset,
    dataEnd,
    recordEnd,
  };
}

function validateLocalExtraFields(extra: Buffer): void {
  let cursor = 0;
  let sawMicrosoftPadding = false;

  while (cursor < extra.length) {
    if (cursor + 4 > extra.length) {
      throw new ResumeExtractionError("malformed_or_unsafe_docx");
    }
    const id = extra.readUInt16LE(cursor);
    const size = extra.readUInt16LE(cursor + 2);
    const valueStart = cursor + 4;
    const valueEnd = checkedEnd(valueStart, size, extra.length);
    const value = extra.subarray(valueStart, valueEnd);

    if (
      id !== 0xa220 ||
      sawMicrosoftPadding ||
      ![36, 260, 516].includes(size) ||
      value[0] !== 0x28 ||
      value[1] !== 0xa0 ||
      value.readUInt16LE(2) !== size - 4 ||
      value.subarray(4).some((byte) => byte !== 0)
    ) {
      throw new ResumeExtractionError("malformed_or_unsafe_docx");
    }

    sawMicrosoftPadding = true;
    cursor = valueEnd;
  }
}

function validateDataDescriptor(
  buffer: Buffer,
  descriptorOffset: number,
  centralOffset: number,
  entry: ZipEntry,
): number {
  let cursor = descriptorOffset;
  const hasSignature =
    checkedEnd(cursor, 4, centralOffset) <= centralOffset &&
    buffer.readUInt32LE(cursor) === 0x08074b50;
  if (hasSignature) {
    cursor += 4;
  }
  const descriptorEnd = checkedEnd(cursor, 12, centralOffset);

  if (
    buffer.readUInt32LE(cursor) !== entry.crc32 ||
    buffer.readUInt32LE(cursor + 4) !== entry.compressedSize ||
    buffer.readUInt32LE(cursor + 8) !== entry.expandedSize
  ) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }

  return descriptorEnd;
}

function validateLocalEntryRanges(
  entries: PreparedZipEntry[],
  centralOffset: number,
): void {
  const sorted = [...entries].sort(
    (left, right) =>
      left.localHeaderOffset - right.localHeaderOffset,
  );
  let expectedOffset = 0;

  for (const entry of sorted) {
    if (
      entry.localHeaderOffset !== expectedOffset ||
      entry.localHeaderOffset >= centralOffset ||
      entry.recordEnd > centralOffset
    ) {
      throw new ResumeExtractionError("malformed_or_unsafe_docx");
    }
    expectedOffset = entry.recordEnd;
  }

  if (expectedOffset !== centralOffset) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }
}

function validateWordDocumentRoot(documentXml: string): void {
  if (
    /<!\s*(?:DOCTYPE|ENTITY)\b/iu.test(documentXml)
  ) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }

  let cursor = documentXml.charCodeAt(0) === 0xfeff ? 1 : 0;
  cursor = skipXmlWhitespace(documentXml, cursor);

  if (documentXml.startsWith("<?xml", cursor)) {
    const declarationBoundary = documentXml[cursor + 5];
    if (
      declarationBoundary !== "?" &&
      !isXmlWhitespace(declarationBoundary)
    ) {
      throw new ResumeExtractionError("malformed_or_unsafe_docx");
    }
    const declarationEnd = documentXml.indexOf("?>", cursor + 5);
    if (
      declarationEnd < 0 ||
      declarationEnd - cursor >
        MAX_ROOT_START_TAG_CHARACTERS
    ) {
      throw new ResumeExtractionError("malformed_or_unsafe_docx");
    }
    cursor = skipXmlWhitespace(documentXml, declarationEnd + 2);
  }

  if (
    documentXml[cursor] !== "<" ||
    ["!", "?", "/"].includes(documentXml[cursor + 1] ?? "")
  ) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }

  const tagEnd = findRootStartTagEnd(documentXml, cursor);
  const startTag = documentXml.slice(cursor + 1, tagEnd);
  const parsed = parseRootStartTag(startTag);
  const [prefix, localName] = splitXmlQualifiedName(
    parsed.rootName,
  );
  const namespace = parsed.namespaceBindings.get(prefix);

  if (
    localName !== "document" ||
    namespace === undefined ||
    !WORDPROCESSINGML_NAMESPACES.has(namespace)
  ) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }
}

function findRootStartTagEnd(
  xml: string,
  rootOffset: number,
): number {
  const limit = Math.min(
    xml.length,
    rootOffset + MAX_ROOT_START_TAG_CHARACTERS,
  );
  let quote = "";

  for (let cursor = rootOffset + 1; cursor < limit; cursor += 1) {
    const character = xml[cursor];
    if (quote) {
      if (character === quote) {
        quote = "";
      } else if (character === "<") {
        throw new ResumeExtractionError("malformed_or_unsafe_docx");
      }
      continue;
    }
    if (character === "\"" || character === "'") {
      quote = character;
    } else if (character === ">") {
      return cursor;
    } else if (character === "<") {
      throw new ResumeExtractionError("malformed_or_unsafe_docx");
    }
  }

  throw new ResumeExtractionError("malformed_or_unsafe_docx");
}

function parseRootStartTag(startTag: string): {
  rootName: string;
  namespaceBindings: Map<string, string>;
} {
  let cursor = 0;
  const root = readXmlQualifiedName(startTag, cursor);
  cursor = root.end;
  const namespaceBindings = new Map<string, string>();
  const attributeNames = new Set<string>();

  while (cursor < startTag.length) {
    const whitespaceStart = cursor;
    cursor = skipXmlWhitespace(startTag, cursor);
    if (startTag[cursor] === "/") {
      cursor += 1;
      cursor = skipXmlWhitespace(startTag, cursor);
      if (cursor !== startTag.length) {
        throw new ResumeExtractionError("malformed_or_unsafe_docx");
      }
      break;
    }
    if (
      cursor === whitespaceStart ||
      cursor >= startTag.length
    ) {
      throw new ResumeExtractionError("malformed_or_unsafe_docx");
    }

    const attribute = readXmlQualifiedName(startTag, cursor);
    cursor = skipXmlWhitespace(startTag, attribute.end);
    if (startTag[cursor] !== "=") {
      throw new ResumeExtractionError("malformed_or_unsafe_docx");
    }
    cursor = skipXmlWhitespace(startTag, cursor + 1);
    const quote = startTag[cursor];
    if (quote !== "\"" && quote !== "'") {
      throw new ResumeExtractionError("malformed_or_unsafe_docx");
    }
    const valueEnd = startTag.indexOf(quote, cursor + 1);
    if (valueEnd < 0) {
      throw new ResumeExtractionError("malformed_or_unsafe_docx");
    }
    const value = startTag.slice(cursor + 1, valueEnd);
    if (value.includes("<") || attributeNames.has(attribute.name)) {
      throw new ResumeExtractionError("malformed_or_unsafe_docx");
    }
    attributeNames.add(attribute.name);

    if (attribute.name === "xmlns") {
      namespaceBindings.set("", value);
    } else if (attribute.name.startsWith("xmlns:")) {
      const namespacePrefix = attribute.name.slice(6);
      if (
        !namespacePrefix ||
        namespaceBindings.has(namespacePrefix)
      ) {
        throw new ResumeExtractionError("malformed_or_unsafe_docx");
      }
      namespaceBindings.set(namespacePrefix, value);
    }
    cursor = valueEnd + 1;
  }

  return {
    rootName: root.name,
    namespaceBindings,
  };
}

function readXmlQualifiedName(
  value: string,
  start: number,
): { name: string; end: number } {
  if (!isXmlNameStart(value[start])) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }
  let cursor = start + 1;
  while (
    cursor < value.length &&
    isXmlNameCharacter(value[cursor])
  ) {
    cursor += 1;
  }
  const name = value.slice(start, cursor);
  if (name.split(":").length > 2) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }
  return { name, end: cursor };
}

function splitXmlQualifiedName(name: string): [string, string] {
  const separator = name.indexOf(":");
  return separator < 0
    ? ["", name]
    : [name.slice(0, separator), name.slice(separator + 1)];
}

function skipXmlWhitespace(value: string, start: number): number {
  let cursor = start;
  while (
    cursor < value.length &&
    isXmlWhitespace(value[cursor])
  ) {
    cursor += 1;
  }
  return cursor;
}

function isXmlWhitespace(value: string | undefined): boolean {
  return value === " " ||
    value === "\t" ||
    value === "\r" ||
    value === "\n";
}

function isXmlNameStart(value: string | undefined): boolean {
  return value === "_" ||
    (value !== undefined && /[A-Za-z]/u.test(value));
}

function isXmlNameCharacter(value: string): boolean {
  return isXmlNameStart(value) || /[0-9.\-:]/u.test(value);
}

function checkedEnd(
  start: number,
  length: number,
  limit: number,
): number {
  const end = start + length;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(length) ||
    start < 0 ||
    length < 0 ||
    !Number.isSafeInteger(end) ||
    end > limit
  ) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }
  return end;
}

function expandEntry(
  buffer: Buffer,
  entry: PreparedZipEntry,
): Buffer {
  const compressed = buffer.subarray(entry.dataOffset, entry.dataEnd);
  let expanded: Buffer;

  try {
    expanded = entry.compressionMethod === 0
      ? Buffer.from(compressed)
      : inflateRawSync(compressed, {
        maxOutputLength: DOCX_LIMITS.maxEntryExpandedBytes + 1,
      });
  } catch {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }

  if (
    expanded.byteLength !== entry.expandedSize ||
    expanded.byteLength > DOCX_LIMITS.maxEntryExpandedBytes ||
    crc32(expanded) !== entry.crc32
  ) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }

  return expanded;
}

function requiredXml(
  entries: Map<string, Buffer>,
  name: string,
): string {
  const value = entries.get(name);
  if (!value) {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(value);
  } catch {
    throw new ResumeExtractionError("malformed_or_unsafe_docx");
  }
}

let crcTable: Uint32Array | null = null;

function crc32(buffer: Buffer): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1) {
        value = (value & 1) !== 0
          ? 0xedb88320 ^ (value >>> 1)
          : value >>> 1;
      }
      crcTable[index] = value >>> 0;
    }
  }

  let value = 0xffffffff;
  for (const byte of buffer) {
    value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}
