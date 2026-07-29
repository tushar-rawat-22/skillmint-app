import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";
import { deflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const srcRoot = path.join(root, "src");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveAlias(
  request,
  parent,
  isMain,
  options,
) {
  return request.startsWith("@/")
    ? originalResolveFilename.call(
      this,
      path.join(srcRoot, request.slice(2)),
      parent,
      isMain,
      options,
    )
    : originalResolveFilename.call(
      this,
      request,
      parent,
      isMain,
      options,
    );
};

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(
    module,
    filename,
  ) {
    const output = ts.transpileModule(
      fs.readFileSync(filename, "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
          jsx: ts.JsxEmit.ReactJSX,
        },
        fileName: filename,
      },
    );
    module._compile(output.outputText, filename);
  };
}

const contract = require(
  "../src/lib/resume/resumeUploadContract.ts",
);
const {
  classifyPdfExtractedText,
  extractResumeTextFromBuffer,
  inspectDocxArchive,
} = require("../src/lib/pdf/extractResumeBuffer.ts");
const { GET: getHealth } = require(
  "../src/app/api/health/config/route.ts",
);
const { POST: extractRoute } = require(
  "../src/app/api/resume/extract/route.ts",
);
const { requestPasswordReset } = require(
  "../src/modules/auth/services/passwordResetRequest.ts",
);

const tests = [];

function test(name, callback) {
  tests.push({ name, callback });
}

function expectCode(code, callback) {
  assert.throws(callback, (error) =>
    error instanceof contract.ResumeExtractionError &&
    error.code === code
  );
}

async function expectCodeAsync(code, callback) {
  await assert.rejects(callback, (error) =>
    error instanceof contract.ResumeExtractionError &&
    error.code === code
  );
}

test("shared upload limits and finite public error contract are exact", () => {
  assert.equal(
    contract.RESUME_UPLOAD_LIMITS.maxFileBytes,
    4 * 1024 * 1024,
  );
  assert.equal(
    contract.RESUME_UPLOAD_LIMITS.maxMultipartBytes,
    4 * 1024 * 1024 + 128 * 1024,
  );
  assert.equal(
    new Set(contract.RESUME_EXTRACTION_ERROR_CODES).size,
    contract.RESUME_EXTRACTION_ERROR_CODES.length,
  );
  for (const code of contract.RESUME_EXTRACTION_ERROR_CODES) {
    const error = contract.RESUME_EXTRACTION_ERRORS[code];
    assert.equal(typeof error.message, "string");
    assert.ok(error.message.length > 0);
    assert.ok(Number.isInteger(error.status));
  }
  assert.equal(
    contract.RESUME_EXTRACTION_ERRORS.scanned_pdf_unsupported.status,
    422,
  );
});

test("file and filename boundaries accept exact limits and reject excess", () => {
  const boundaryName = `${"a".repeat(116)}.txt`;
  assert.equal(Array.from(boundaryName).length, 120);
  assert.equal(
    contract.validateResumeFileMetadata({
      name: boundaryName,
      size: 4 * 1024 * 1024,
      mimeType: "text/plain",
    }),
    "txt",
  );

  expectCode("file_too_large", () =>
    contract.validateResumeFileMetadata({
      name: "resume.txt",
      size: 4 * 1024 * 1024 + 1,
      mimeType: "text/plain",
    })
  );
  expectCode("unsafe_filename", () =>
    contract.validateResumeFileMetadata({
      name: `${"a".repeat(117)}.txt`,
      size: 1,
      mimeType: "text/plain",
    })
  );
});

test("unsafe names, unsupported extensions, and meaningful MIME mismatches fail", () => {
  for (const name of [
    "",
    "../resume.pdf",
    "folder/resume.pdf",
    "folder\\resume.pdf",
    "resume\u0000.pdf",
  ]) {
    expectCode("unsafe_filename", () =>
      contract.validateResumeFileMetadata({
        name,
        size: 1,
        mimeType: "application/pdf",
      })
    );
  }
  expectCode("unsupported_type", () =>
    contract.validateResumeFileMetadata({
      name: "resume.rtf",
      size: 1,
      mimeType: "application/rtf",
    })
  );
  expectCode("mime_signature_mismatch", () =>
    contract.validateResumeFileMetadata({
      name: "resume.pdf",
      size: 1,
      mimeType: "text/plain",
    })
  );
  assert.equal(
    contract.validateResumeFileMetadata({
      name: "Résumé-正常.docx",
      size: 1,
      mimeType: "",
    }),
    "docx",
  );
});

test("TXT extraction accepts valid UTF-8 and rejects empty, binary, and excessive text", async () => {
  assert.equal(
    await extractResumeTextFromBuffer(
      Buffer.from("Skills: TypeScript\nProjects: Built a safe app."),
      "txt",
    ),
    "Skills: TypeScript\nProjects: Built a safe app.",
  );
  await expectCodeAsync("empty_document", () =>
    extractResumeTextFromBuffer(Buffer.from(" \n\t "), "txt")
  );
  await expectCodeAsync("mime_signature_mismatch", () =>
    extractResumeTextFromBuffer(
      Buffer.from([0xff, 0x00, 0x01]),
      "txt",
    )
  );
  await expectCodeAsync("excessive_extracted_text", () =>
    extractResumeTextFromBuffer(
      Buffer.from(
        "a".repeat(
          contract.RESUME_UPLOAD_LIMITS.maxExtractedTextCharacters +
            1,
        ),
      ),
      "txt",
    )
  );
});

test("PDF extraction accepts concise text and rejects fake, truncated, scanned, and empty PDFs", async () => {
  const dependencyFixture = fs.readFileSync(
    require.resolve("pdf-parse/test/data/01-valid.pdf"),
  );
  assert.match(
    await extractResumeTextFromBuffer(dependencyFixture, "pdf"),
    /\S/u,
  );
  assert.equal(
    classifyPdfExtractedText("Ada Lovelace", false),
    "Ada Lovelace",
  );
  await expectCodeAsync("mime_signature_mismatch", () =>
    extractResumeTextFromBuffer(
      Buffer.from("not a PDF at all"),
      "pdf",
    )
  );
  await expectCodeAsync("malformed_pdf", () =>
    extractResumeTextFromBuffer(
      Buffer.from("%PDF-1.4\ntruncated"),
      "pdf",
    )
  );
  await expectCodeAsync("malformed_pdf", () =>
    extractResumeTextFromBuffer(
      Buffer.from(
        "%PDF-1.4\nparser-invalid content that has a trailer\n%%EOF\n",
      ),
      "pdf",
    )
  );
  expectCode("scanned_pdf_unsupported", () =>
    classifyPdfExtractedText("", true)
  );
  expectCode("empty_document", () =>
    classifyPdfExtractedText("", false)
  );
});

test("DOCX extraction accepts a minimal valid Office archive and rejects empty content", async () => {
  const valid = createDocx("Ada built a TypeScript project.");
  assert.equal(
    await extractResumeTextFromBuffer(valid, "docx"),
    "Ada built a TypeScript project.",
  );
  await expectCodeAsync("empty_document", () =>
    extractResumeTextFromBuffer(createDocx(""), "docx")
  );
});

test("DOCX root validation uses namespace URI and local-name semantics", async () => {
  const transitional =
    "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const strict =
    "http://purl.oclc.org/ooxml/wordprocessingml/main";
  const standard = createDocxFromDocumentXml(
    `<w:document xmlns:w="${transitional}"><w:body><w:p><w:r><w:t>Standard prefix</w:t></w:r></w:p></w:body></w:document>`,
  );
  const alternate = createDocxFromDocumentXml(
    `<?xml version="1.0"?>\n<x:document xmlns:x="${transitional}"><x:body><x:p><x:r><x:t>Alternate prefix</x:t></x:r></x:p></x:body></x:document>`,
  );
  const defaultNamespace = createDocxFromDocumentXml(
    ` \n<document xmlns="${transitional}"><body><p><r><t>Default namespace</t></r></p></body></document>`,
  );
  const strictNamespace = createDocxFromDocumentXml(
    `<s:document xmlns:s="${strict}"><s:body><s:p><s:r><s:t>Strict namespace</s:t></s:r></s:p></s:body></s:document>`,
  );

  inspectDocxArchive(standard);
  assert.equal(
    await extractResumeTextFromBuffer(alternate, "docx"),
    "Alternate prefix",
  );
  assert.equal(
    await extractResumeTextFromBuffer(
      defaultNamespace,
      "docx",
    ),
    "Default namespace",
  );
  assert.equal(
    await extractResumeTextFromBuffer(strictNamespace, "docx"),
    "Strict namespace",
  );
  assert.match(
    await extractResumeTextFromBuffer(
      fs.readFileSync(
        path.join(
          root,
          "node_modules/mammoth/test/test-data/strict-format.docx",
        ),
      ),
      "docx",
    ),
    /\S/u,
  );

  for (const invalidDocumentXml of [
    '<x:document xmlns:x="https://wrong.example"><x:body/></x:document>',
    "<x:document><x:body/></x:document>",
    `<w:body xmlns:w="${transitional}"/>`,
    `<!DOCTYPE w:document><w:document xmlns:w="${transitional}"/>`,
    `<!ENTITY unsafe "value"><w:document xmlns:w="${transitional}"/>`,
  ]) {
    expectCode("malformed_or_unsafe_docx", () =>
      inspectDocxArchive(
        createDocxFromDocumentXml(invalidDocumentXml),
      )
    );
  }

  await expectCodeAsync("malformed_or_unsafe_docx", () =>
    extractResumeTextFromBuffer(
      createDocxFromDocumentXml(
        `<w:document xmlns:w="${transitional}"><w:body>`,
      ),
      "docx",
    )
  );
});

test("DOCX rejects fake archives, malformed ZIPs, and missing Office structure", async () => {
  await expectCodeAsync("mime_signature_mismatch", () =>
    extractResumeTextFromBuffer(
      Buffer.from("not an office archive"),
      "docx",
    )
  );
  await expectCodeAsync("malformed_or_unsafe_docx", () =>
    extractResumeTextFromBuffer(
      Buffer.from("PK\u0003\u0004truncated"),
      "docx",
    )
  );
  await expectCodeAsync("malformed_or_unsafe_docx", () =>
    extractResumeTextFromBuffer(
      createZip([
        { name: "[Content_Types].xml", data: "<Types/>" },
      ]),
      "docx",
    )
  );
});

test("DOCX rejects encrypted and unsupported archive modes", () => {
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(
      createZip([{
        name: "encrypted.bin",
        data: "encrypted",
        flags: 0x0801,
      }]),
    )
  );
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(
      createZip([{
        name: "unsupported.bin",
        data: "unsupported",
        method: 99,
      }]),
    )
  );
});

test("DOCX accepts reviewed real fixtures, Microsoft padding, and exact data descriptors", async () => {
  const paragraphFixture = fs.readFileSync(
    path.join(
      root,
      "node_modules/mammoth/test/test-data/single-paragraph.docx",
    ),
  );
  inspectDocxArchive(paragraphFixture);
  assert.match(
    await extractResumeTextFromBuffer(
      paragraphFixture,
      "docx",
    ),
    /\S/u,
  );

  const descriptorFixture = fs.readFileSync(
    path.join(
      root,
      "node_modules/mammoth/test/test-data/empty.docx",
    ),
  );
  inspectDocxArchive(descriptorFixture);

  const unsignedDescriptor = createDocx(
    "Unsigned descriptor remains bounded.",
    [],
    {
      "[Content_Types].xml": {
        descriptor: true,
        descriptorSignature: false,
      },
    },
  );
  assert.equal(
    await extractResumeTextFromBuffer(
      unsignedDescriptor,
      "docx",
    ),
    "Unsigned descriptor remains bounded.",
  );
});

test("DOCX local metadata and names must agree exactly with the central directory", async () => {
  const mutations = [
    { label: "CRC", fieldOffset: 14 },
    { label: "compressed size", fieldOffset: 18 },
    { label: "expanded size", fieldOffset: 22 },
  ];

  for (const { label, fieldOffset } of mutations) {
    const archive = createDocx(`Reject local ${label}.`);
    const { entries } = locateZipEntries(archive);
    const localOffset = entries[0].localOffset;
    archive.writeUInt32LE(
      (archive.readUInt32LE(localOffset + fieldOffset) + 1) >>> 0,
      localOffset + fieldOffset,
    );
    expectCode("malformed_or_unsafe_docx", () =>
      inspectDocxArchive(archive)
    );
  }

  const filenameMismatch = createDocx(
    "Reject filename disagreement.",
  );
  const { entries } = locateZipEntries(filenameMismatch);
  filenameMismatch[entries[0].localOffset + 30] ^= 0x01;
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(filenameMismatch)
  );
  await expectCodeAsync("malformed_or_unsafe_docx", () =>
    extractResumeTextFromBuffer(filenameMismatch, "docx")
  );
});

test("DOCX rejects strong encryption, patched data, and every unsupported flag bit", () => {
  for (const flag of [0x0040, 0x0020, 0x0010, 0x2000]) {
    const archive = createDocx(`Reject flag ${flag}.`);
    const { entries } = locateZipEntries(archive);
    const entry = entries[0];
    archive.writeUInt16LE(
      archive.readUInt16LE(entry.localOffset + 6) | flag,
      entry.localOffset + 6,
    );
    archive.writeUInt16LE(
      archive.readUInt16LE(entry.centralOffset + 8) | flag,
      entry.centralOffset + 8,
    );
    expectCode("malformed_or_unsafe_docx", () =>
      inspectDocxArchive(archive)
    );
  }
});

test("DOCX rejects overlapping records, payload crossings, and ranges entering the central directory", () => {
  const overlapping = createDocx("Reject duplicate local ranges.");
  const overlappingLocations = locateZipEntries(overlapping);
  overlapping.writeUInt32LE(
    overlappingLocations.entries[0].localOffset,
    overlappingLocations.entries[1].centralOffset + 42,
  );
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(overlapping)
  );

  const crossing = createDocx("Reject payload crossing.");
  const crossingLocations = locateZipEntries(crossing);
  const first = crossingLocations.entries[0];
  const second = crossingLocations.entries[1];
  const firstNameLength = crossing.readUInt16LE(
    first.localOffset + 26,
  );
  const firstExtraLength = crossing.readUInt16LE(
    first.localOffset + 28,
  );
  const firstDataOffset =
    first.localOffset + 30 + firstNameLength + firstExtraLength;
  const crossingSize = second.localOffset - firstDataOffset + 1;
  crossing.writeUInt32LE(crossingSize, first.localOffset + 18);
  crossing.writeUInt32LE(crossingSize, first.centralOffset + 20);
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(crossing)
  );

  const centralCrossing = createDocx(
    "Reject range into central directory.",
  );
  const centralLocations = locateZipEntries(centralCrossing);
  const last = centralLocations.entries.at(-1);
  assert.ok(last);
  const lastNameLength = centralCrossing.readUInt16LE(
    last.localOffset + 26,
  );
  const lastExtraLength = centralCrossing.readUInt16LE(
    last.localOffset + 28,
  );
  const lastDataOffset =
    last.localOffset + 30 + lastNameLength + lastExtraLength;
  const centralCrossingSize =
    centralLocations.centralOffset - lastDataOffset + 1;
  centralCrossing.writeUInt32LE(
    centralCrossingSize,
    last.localOffset + 18,
  );
  centralCrossing.writeUInt32LE(
    centralCrossingSize,
    last.centralOffset + 20,
  );
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(centralCrossing)
  );
});

test("DOCX requires complete contiguous coverage of the physical local-record section", async () => {
  inspectDocxArchive(createDocx("Contiguous records pass."));

  const orphanAtEndBase = createDocx(
    "Reject an orphan before the central directory.",
  );
  const orphanAtEndLocations =
    locateZipEntries(orphanAtEndBase);
  const orphanAtEnd = insertLocalSectionBytes(
    orphanAtEndBase,
    orphanAtEndLocations.centralOffset,
    createOrphanLocalRecord(),
  );
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(orphanAtEnd)
  );
  await expectCodeAsync("malformed_or_unsafe_docx", () =>
    extractResumeTextFromBuffer(orphanAtEnd, "docx")
  );

  const orphanBetweenBase = createDocx(
    "Reject an orphan between records.",
  );
  const orphanBetweenLocations =
    locateZipEntries(orphanBetweenBase);
  const orphanBetween = insertLocalSectionBytes(
    orphanBetweenBase,
    orphanBetweenLocations.entries[1].localOffset,
    createOrphanLocalRecord(),
  );
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(orphanBetween)
  );

  const gapBase = createDocx("Reject gap bytes.");
  const gapLocations = locateZipEntries(gapBase);
  const gap = insertLocalSectionBytes(
    gapBase,
    gapLocations.entries[1].localOffset,
    Buffer.from("GAP"),
  );
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(gap)
  );

  const trailingBase = createDocx(
    "Reject trailing local-section bytes.",
  );
  const trailingLocations = locateZipEntries(trailingBase);
  const trailing = insertLocalSectionBytes(
    trailingBase,
    trailingLocations.centralOffset,
    Buffer.from("TRAILING"),
  );
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(trailing)
  );

  const preambleBase = createDocx("Reject preamble bytes.");
  const preamble = insertLocalSectionBytes(
    preambleBase,
    0,
    Buffer.from("PREAMBLE"),
  );
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(preamble)
  );
});

test("DOCX local and central extractor versions must agree with supported ZIP features", () => {
  const mismatch = createDocx(
    "Reject version mismatch.",
    [],
    {
      "[Content_Types].xml": {
        localVersionNeeded: 0x0314,
        centralVersionNeeded: 20,
      },
    },
  );
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(mismatch)
  );

  const central99 = createDocx(
    "Reject central version 99.",
    [],
    {
      "[Content_Types].xml": {
        versionNeeded: 99,
      },
    },
  );
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(central99)
  );

  const local99 = createDocx(
    "Reject local version 99.",
    [],
    {
      "[Content_Types].xml": {
        localVersionNeeded: 99,
        centralVersionNeeded: 20,
      },
    },
  );
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(local99)
  );

  const lowDeflate = createDocx(
    "Reject low Deflate version.",
    [],
    {
      "[Content_Types].xml": {
        versionNeeded: 10,
      },
    },
  );
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(lowDeflate)
  );

  const lowDescriptor = createDocx(
    "Reject low descriptor version.",
    [],
    {
      "[Content_Types].xml": {
        descriptor: true,
        method: 0,
        versionNeeded: 10,
      },
    },
  );
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(lowDescriptor)
  );

  for (const fixtureName of [
    "embedded-style-map.docx",
    "single-paragraph.docx",
    "empty.docx",
  ]) {
    inspectDocxArchive(
      fs.readFileSync(
        path.join(
          root,
          "node_modules/mammoth/test/test-data",
          fixtureName,
        ),
      ),
    );
  }
});

test("DOCX rejects ZIP64, AES, Unicode-path extras, and contradictory descriptors", () => {
  const unsafeExtras = [
    {
      id: 0x0001,
      location: "centralExtra",
      value: Buffer.alloc(8),
    },
    {
      id: 0x9901,
      location: "localExtra",
      value: Buffer.alloc(7),
    },
    {
      id: 0x7075,
      location: "centralExtra",
      value: Buffer.from("renamed.xml"),
    },
  ];

  for (const { id, location, value } of unsafeExtras) {
    const archive = createDocx(
      `Reject extra ${id}.`,
      [],
      {
        "[Content_Types].xml": {
          [location]: createExtraField(id, value),
        },
      },
    );
    expectCode("malformed_or_unsafe_docx", () =>
      inspectDocxArchive(archive)
    );
  }

  const contradictory = createDocx(
    "Reject descriptor contradiction.",
    [],
    {
      "[Content_Types].xml": {
        descriptor: true,
      },
    },
  );
  const { entries } = locateZipEntries(contradictory);
  const first = entries[0];
  const nameLength = contradictory.readUInt16LE(
    first.localOffset + 26,
  );
  const extraLength = contradictory.readUInt16LE(
    first.localOffset + 28,
  );
  const descriptorOffset =
    first.localOffset +
    30 +
    nameLength +
    extraLength +
    contradictory.readUInt32LE(first.centralOffset + 20);
  contradictory.writeUInt32LE(
    (
      contradictory.readUInt32LE(descriptorOffset + 4) + 1
    ) >>> 0,
    descriptorOffset + 4,
  );
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(contradictory)
  );
});

test("DOCX rejects traversal, absolute, and duplicate-dangerous entries", () => {
  for (const unsafeName of [
    "../word/document.xml",
    "/word/document.xml",
    "C:/word/document.xml",
    "word\\document.xml",
  ]) {
    expectCode("malformed_or_unsafe_docx", () =>
      inspectDocxArchive(
        createZip([{ name: unsafeName, data: "unsafe" }]),
      )
    );
  }
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(
      createZip([
        { name: "word/document.xml", data: "one" },
        { name: "WORD/DOCUMENT.XML", data: "two" },
      ]),
    )
  );
});

test("DOCX archive entry-count, entry-size, total-size, and ratio limits fail closed", () => {
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(
      createZip(
        Array.from({ length: 257 }, (_, index) => ({
          name: `entries/${index}.txt`,
          data: "",
        })),
      ),
    )
  );
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(
      createZip([{
        name: "large.bin",
        data: Buffer.alloc(4 * 1024 * 1024 + 1, 1),
        method: 0,
      }]),
    )
  );
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(
      createZip(
        Array.from({ length: 4 }, (_, index) => ({
          name: `large/${index}.bin`,
          data: Buffer.alloc(4 * 1024 * 1024, index),
          method: 0,
        })),
      ),
    )
  );
  expectCode("malformed_or_unsafe_docx", () =>
    inspectDocxArchive(
      createZip([{
        name: "ratio.bin",
        data: Buffer.alloc(128 * 1024, 0),
      }]),
    )
  );
});

test("same-origin extraction succeeds and explicit cross-origin requests fail with typed responses", async () => {
  const sameOrigin = await extractionRequest({
    file: new File(
      [Buffer.from("Skills: TypeScript\nProjects: Secure upload")],
      "resume.txt",
      { type: "text/plain" },
    ),
  });
  assert.equal(sameOrigin.status, 200);
  assert.deepEqual(await sameOrigin.json(), {
    extractedText: "Skills: TypeScript\nProjects: Secure upload",
  });
  assert.match(
    sameOrigin.headers.get("cache-control") ?? "",
    /no-store/u,
  );

  const crossOrigin = await extractionRequest({
    file: new File(["valid"], "resume.txt", {
      type: "text/plain",
    }),
    origin: "https://cross-origin.invalid",
  });
  assert.equal(crossOrigin.status, 403);
  assert.deepEqual(await crossOrigin.json(), {
    code: "cross_origin_request",
    message:
      contract.RESUME_EXTRACTION_ERRORS.cross_origin_request.message,
  });
  assert.match(
    crossOrigin.headers.get("cache-control") ?? "",
    /no-store/u,
  );
});

test("origin authority trusts the request URL or a strict Host value and ignores forwarded host data", async () => {
  const file = () =>
    new File(
      ["Skills: TypeScript\nProjects: Origin checks"],
      "resume.txt",
      { type: "text/plain" },
    );

  const strictHostFallback = await extractionRequest({
    file: file(),
    requestUrl:
      "http://internal.example.test/api/resume/extract",
    origin: "http://app.example.test",
    host: "app.example.test",
  });
  assert.equal(strictHostFallback.status, 200);

  const malformedHost = await extractionRequest({
    file: file(),
    requestUrl:
      "http://internal.example.test/api/resume/extract",
    origin: "http://evil.example.test",
    host: "victim.example.test@evil.example.test",
  });
  assert.equal(malformedHost.status, 403);

  const forwardedUserinfo = await extractionRequest({
    file: file(),
    requestUrl:
      "http://internal.example.test/api/resume/extract",
    origin: "http://evil.example.test",
    host: "internal.example.test",
    forwardedHost:
      "victim.example.test@evil.example.test",
  });
  assert.equal(forwardedUserinfo.status, 403);

  const canonicalRequestUrl = await extractionRequest({
    file: file(),
    forwardedHost:
      "victim.example.test@evil.example.test",
  });
  assert.equal(canonicalRequestUrl.status, 200);
});

test("route enforces the exact 4 MiB file boundary independently of multipart overhead", async () => {
  const boundaryText =
    "Skills: TypeScript\nProjects: exact DOCX boundary";
  const emptyPaddingArchive = createDocx(
    boundaryText,
    [{
      name: "word/media/padding.bin",
      data: Buffer.alloc(0),
      method: 0,
    }],
  );
  const paddingSize =
    contract.RESUME_UPLOAD_LIMITS.maxFileBytes -
    emptyPaddingArchive.length;
  assert.ok(paddingSize > 0);
  const exactBytes = createDocx(
    boundaryText,
    [{
      name: "word/media/padding.bin",
      data: Buffer.alloc(paddingSize, 0x5a),
      method: 0,
    }],
  );
  assert.equal(
    exactBytes.length,
    contract.RESUME_UPLOAD_LIMITS.maxFileBytes,
  );
  const exact = await extractionRequest({
    file: new File([exactBytes], "boundary.docx", {
      type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
  });
  assert.equal(exact.status, 200);
  assert.deepEqual(await exact.json(), {
    extractedText: boundaryText,
  });
  assert.match(
    exact.headers.get("cache-control") ?? "",
    /no-store/u,
  );

  const over = await extractionRequest({
    file: new File(
      [exactBytes, Buffer.from([0])],
      "over.docx",
      {
        type:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    ),
  });
  assert.equal(over.status, 413);
  assert.equal((await over.json()).code, "file_too_large");
});

test("route rejects missing files, oversized multipart declarations, and signature mismatches", async () => {
  const missing = await extractionRequest({});
  assert.equal(missing.status, 400);
  assert.equal((await missing.json()).code, "missing_file");

  const oversized = await extractionRequest({
    contentLength:
      contract.RESUME_UPLOAD_LIMITS.maxMultipartBytes + 1,
  });
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).code, "file_too_large");

  const mismatch = await extractionRequest({
    file: new File(["plain text"], "resume.pdf", {
      type: "application/pdf",
    }),
  });
  assert.equal(mismatch.status, 415);
  assert.equal(
    (await mismatch.json()).code,
    "mime_signature_mismatch",
  );
  assert.match(
    mismatch.headers.get("cache-control") ?? "",
    /no-store/u,
  );

  const malformedPdf = await extractionRequest({
    file: new File(
      [Buffer.from("%PDF-1.4\ntruncated")],
      "malformed.pdf",
      { type: "application/pdf" },
    ),
  });
  assert.equal(
    (await malformedPdf.json()).code,
    "malformed_pdf",
  );
  assert.match(
    malformedPdf.headers.get("cache-control") ?? "",
    /no-store/u,
  );

  const unboundedFallback = new Request(
    "http://app.example.test/api/resume/extract",
    {
      method: "POST",
      headers: {
        origin: "http://app.example.test",
        "sec-fetch-site": "same-origin",
        "content-type": "application/octet-stream",
      },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(
            new Uint8Array(
              contract.RESUME_UPLOAD_LIMITS.maxMultipartBytes + 1,
            ),
          );
          controller.close();
        },
      }),
      duplex: "half",
    },
  );
  const bounded = await extractRoute(unboundedFallback);
  assert.equal(bounded.status, 413);
  assert.equal((await bounded.json()).code, "file_too_large");
  assert.match(
    bounded.headers.get("cache-control") ?? "",
    /no-store/u,
  );
});

test("client response parser trusts only finite codes and valid success text", () => {
  assert.equal(
    contract.getKnownExtractionError({
      code: "scanned_pdf_unsupported",
      message: "RAW_UNTRUSTED_MESSAGE",
    }).message,
    contract.RESUME_EXTRACTION_ERRORS.scanned_pdf_unsupported.message,
  );
  assert.equal(
    contract.getKnownExtractionError({
      code: "unknown",
      message: "RAW_UNTRUSTED_MESSAGE",
    }),
    null,
  );
  assert.equal(
    contract.isResumeExtractionSuccessPayload({
      code: "empty_document",
      message: "not text",
    }),
    false,
  );
  assert.equal(
    contract.isResumeExtractionSuccessPayload({
      extractedText: "valid",
    }),
    true,
  );
});

test("analysis rejects before parsing, scoring, publication, or persistence", async () => {
  const counters = {
    parse: 0,
    profile: 0,
    score: 0,
  };
  const stubs = [
    [
      "../src/lib/pdf/extractText.ts",
      {
        extractTextFromResume: async () => {
          throw new contract.ResumeExtractionError("empty_document");
        },
      },
    ],
    [
      "../src/lib/parser/profileBuilder.ts",
      {
        parseResumeText: () => {
          counters.parse += 1;
          return {};
        },
      },
    ],
    [
      "../src/lib/resume/buildUserProfileFromParsedResume.ts",
      {
        buildUserProfileFromParsedResume: () => {
          counters.profile += 1;
          return {};
        },
      },
    ],
    [
      "../src/intelligence/proof/index.ts",
      {
        generateProofScore: () => {
          counters.score += 1;
          return {};
        },
      },
    ],
    [
      "../src/intelligence/scoring/index.ts",
      { SCORING_VERSION: "fixture" },
    ],
  ];
  const previous = new Map();
  for (const [modulePath, exports] of stubs) {
    const resolved = require.resolve(modulePath);
    previous.set(resolved, require.cache[resolved]);
    require.cache[resolved] = moduleStub(resolved, exports);
  }

  const analysisPath = require.resolve(
    "../src/lib/resume/analyzeResume.ts",
  );
  delete require.cache[analysisPath];
  try {
    const { analyzeResume } = require(analysisPath);
    await assert.rejects(
      () =>
        analyzeResume(
          new File(["resume"], "resume.txt", {
            type: "text/plain",
          }),
        ),
      (error) => error.code === "empty_document",
    );
    assert.deepEqual(counters, {
      parse: 0,
      profile: 0,
      score: 0,
    });

    const uploadSource = fs.readFileSync(
      path.join(root, "src/app/upload/page.tsx"),
      "utf8",
    );
    const analysisIndex = uploadSource.indexOf(
      "await runResumeAnalysis(file)",
    );
    const persistenceIndex = uploadSource.indexOf(
      "saveResumeAnalysisForOperation(",
      analysisIndex,
    );
    const publicationIndex = uploadSource.indexOf(
      "writeActiveResumeReport(result",
      analysisIndex,
    );
    assert.ok(analysisIndex >= 0);
    assert.ok(persistenceIndex > analysisIndex);
    assert.ok(publicationIndex > persistenceIndex);
    assert.doesNotMatch(
      uploadSource,
      /setError\(\s*error instanceof Error/u,
    );
    assert.match(
      uploadSource,
      /error instanceof ResumeExtractionError/u,
    );
    assert.match(
      uploadSource,
      /Resume analysis failed\. Please try again\./u,
    );
  } finally {
    delete require.cache[analysisPath];
    for (const [resolved, cached] of previous) {
      if (cached) {
        require.cache[resolved] = cached;
      } else {
        delete require.cache[resolved];
      }
    }
  }
});

test("password reset support passes an optional opaque CAPTCHA token without inventing one", async () => {
  const calls = [];
  const client = {
    auth: {
      resetPasswordForEmail: async (email, options) => {
        calls.push({ email, options });
        return { data: {}, error: null };
      },
    },
  };
  assert.deepEqual(
    await requestPasswordReset(client, {
      email: "person@example.test",
      redirectTo: "https://app.example.test/reset-password",
      captchaToken: " opaque-token ",
    }),
    { ok: true },
  );
  assert.deepEqual(calls[0].options, {
    redirectTo: "https://app.example.test/reset-password",
    captchaToken: " opaque-token ",
  });

  await requestPasswordReset(client, {
    email: "person@example.test",
    redirectTo: "https://app.example.test/reset-password",
  });
  assert.deepEqual(calls[1].options, {
    redirectTo: "https://app.example.test/reset-password",
  });
});

test("password reset support converts returned provider failures without exposing provider text", async () => {
  const result = await requestPasswordReset(
    {
      auth: {
        resetPasswordForEmail: async () => ({
          data: null,
          error: new Error("RAW_PROVIDER_DETAIL"),
        }),
      },
    },
    {
      email: "person@example.test",
      redirectTo: "https://app.example.test/reset-password",
    },
  );
  assert.deepEqual(result, { ok: false });
  assert.equal(JSON.stringify(result).includes("RAW_PROVIDER_DETAIL"), false);
});

test("health response is coarse, deterministic, status-aware, and no-store", async () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://configured.example.test";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "fixture-public-key";
    const healthy = getHealth();
    assert.equal(healthy.status, 200);
    assert.deepEqual(await healthy.json(), { status: "healthy" });
    assert.match(
      healthy.headers.get("cache-control") ?? "",
      /no-store/,
    );

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const degraded = getHealth();
    assert.equal(degraded.status, 503);
    const body = await degraded.json();
    assert.deepEqual(body, { status: "degraded" });
    assert.equal(
      JSON.stringify(body).includes("NEXT_PUBLIC_"),
      false,
    );
    assert.match(
      degraded.headers.get("cache-control") ?? "",
      /no-store/,
    );
  } finally {
    restoreEnvironment(
      "NEXT_PUBLIC_SUPABASE_URL",
      originalUrl,
    );
    restoreEnvironment(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      originalKey,
    );
  }
});

test("configured security headers use a bounded CSP and production excludes unsafe-eval", async () => {
  const configPath = require.resolve("../next.config.ts");
  const originalNodeEnv = process.env.NODE_ENV;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://configured.example.test";
    delete require.cache[configPath];
    const configModule = require(configPath);
    const configuredHeaders =
      await configModule.default.headers();
    const headers = Object.fromEntries(
      configuredHeaders[0].headers.map(({ key, value }) => [
        key,
        value,
      ]),
    );
    assert.match(headers["Content-Security-Policy"], /default-src 'self'/);
    assert.match(headers["Content-Security-Policy"], /frame-ancestors 'none'/);
    assert.match(
      headers["Content-Security-Policy"],
      /connect-src 'self' https:\/\/configured\.example\.test wss:\/\/configured\.example\.test/,
    );
    assert.doesNotMatch(
      headers["Content-Security-Policy"],
      /unsafe-eval/,
    );
    assert.doesNotMatch(
      headers["Content-Security-Policy"],
      /connect-src[^;]*\*/,
    );
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
    assert.equal(headers["X-Frame-Options"], "DENY");
    assert.equal(
      headers["Referrer-Policy"],
      "strict-origin-when-cross-origin",
    );
    assert.match(headers["Permissions-Policy"], /camera=\(\)/);
  } finally {
    delete require.cache[configPath];
    restoreEnvironment("NODE_ENV", originalNodeEnv);
    restoreEnvironment(
      "NEXT_PUBLIC_SUPABASE_URL",
      originalUrl,
    );
  }
});

test("CI whitespace gate checks committed parent diffs and fails closed when a parent is unavailable", () => {
  const workflow = fs.readFileSync(
    path.join(root, ".github/workflows/ci.yml"),
    "utf8",
  );
  assert.match(workflow, /fetch-depth:\s*0/u);
  assert.match(
    workflow,
    /git diff --check HEAD\^1 HEAD/u,
  );
  assert.match(
    workflow,
    /git diff-tree --check --root --no-commit-id -r HEAD/u,
  );
  assert.match(
    workflow,
    /git cat-file -p HEAD \| grep -q '\^parent '/u,
  );
  assert.doesNotMatch(
    workflow,
    /run:\s*git diff --check\s*(?:\n|$)/u,
  );
});

let failures = 0;
for (const fixture of tests) {
  try {
    await fixture.callback();
    console.log(`PASS ${fixture.name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${fixture.name}`);
    console.error(
      error instanceof Error ? error.message : "Unknown fixture error",
    );
  }
}

if (failures > 0) {
  console.error(
    `${failures} of ${tests.length} launch-hardening fixtures failed.`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `${tests.length} launch-hardening deterministic fixtures passed.`,
  );
}

async function extractionRequest({
  file,
  origin = "http://app.example.test",
  contentLength,
  requestUrl = "http://app.example.test/api/resume/extract",
  host,
  forwardedHost,
}) {
  const formData = new FormData();
  if (file) {
    formData.set("file", file);
  }
  const headers = new Headers({
    origin,
    "sec-fetch-site": "same-origin",
  });
  if (contentLength !== undefined) {
    headers.set("content-length", String(contentLength));
  }
  if (host !== undefined) {
    headers.set("host", host);
  }
  if (forwardedHost !== undefined) {
    headers.set("x-forwarded-host", forwardedHost);
  }
  const request = new Request(
    requestUrl,
    {
      method: "POST",
      headers,
      body: formData,
    },
  );
  return extractRoute(request);
}

function createDocx(
  text,
  additionalEntries = [],
  entryOverrides = {},
) {
  const documentText = escapeXml(text);
  return createDocxFromDocumentXml(
    '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      `<w:body><w:p><w:r><w:t>${documentText}</w:t></w:r></w:p></w:body>` +
      "</w:document>",
    additionalEntries,
    entryOverrides,
  );
}

function createDocxFromDocumentXml(
  documentXml,
  additionalEntries = [],
  entryOverrides = {},
) {
  const entries = [
    {
      name: "[Content_Types].xml",
      data:
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        "</Types>",
    },
    {
      name: "_rels/.rels",
      data:
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        "</Relationships>",
    },
    {
      name: "word/document.xml",
      data: documentXml,
    },
    ...additionalEntries,
  ];
  return createZip(
    entries.map((entry) => ({
      ...entry,
      ...(entryOverrides[entry.name] ?? {}),
    })),
  );
}

function createZip(inputs) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const input of inputs) {
    const name = Buffer.from(input.name, "utf8");
    const localName = Buffer.from(
      input.localName ?? input.name,
      "utf8",
    );
    const data = Buffer.isBuffer(input.data)
      ? input.data
      : Buffer.from(input.data, "utf8");
    const method = input.method ?? 8;
    const flags = input.flags ??
      (input.descriptor ? 0x0808 : 0x0800);
    const versionNeeded = input.versionNeeded ?? 20;
    const localVersionNeeded =
      input.localVersionNeeded ?? versionNeeded;
    const centralVersionNeeded =
      input.centralVersionNeeded ?? versionNeeded;
    const localExtra = input.localExtra ?? Buffer.alloc(0);
    const centralExtra = input.centralExtra ?? Buffer.alloc(0);
    const compressed = method === 0
      ? data
      : deflateRawSync(data);
    const checksum = crc32(data);
    const local = Buffer.alloc(
      30 + localName.length + localExtra.length,
    );
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(localVersionNeeded, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(input.descriptor ? 0 : checksum, 14);
    local.writeUInt32LE(
      input.descriptor ? 0 : compressed.length,
      18,
    );
    local.writeUInt32LE(input.descriptor ? 0 : data.length, 22);
    local.writeUInt16LE(localName.length, 26);
    local.writeUInt16LE(localExtra.length, 28);
    localName.copy(local, 30);
    localExtra.copy(local, 30 + localName.length);

    const central = Buffer.alloc(
      46 + name.length + centralExtra.length,
    );
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(centralVersionNeeded, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(centralExtra.length, 30);
    central.writeUInt32LE(localOffset, 42);
    name.copy(central, 46);
    centralExtra.copy(central, 46 + name.length);

    const descriptor = input.descriptor
      ? createDataDescriptor({
        checksum,
        compressedSize: compressed.length,
        expandedSize: data.length,
        signature: input.descriptorSignature !== false,
      })
      : Buffer.alloc(0);

    localParts.push(local, compressed, descriptor);
    centralParts.push(central);
    localOffset +=
      local.length + compressed.length + descriptor.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(inputs.length, 8);
  end.writeUInt16LE(inputs.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function createDataDescriptor({
  checksum,
  compressedSize,
  expandedSize,
  signature,
}) {
  const descriptor = Buffer.alloc(signature ? 16 : 12);
  const offset = signature ? 4 : 0;
  if (signature) {
    descriptor.writeUInt32LE(0x08074b50, 0);
  }
  descriptor.writeUInt32LE(checksum, offset);
  descriptor.writeUInt32LE(compressedSize, offset + 4);
  descriptor.writeUInt32LE(expandedSize, offset + 8);
  return descriptor;
}

function createExtraField(id, value) {
  const field = Buffer.alloc(4 + value.length);
  field.writeUInt16LE(id, 0);
  field.writeUInt16LE(value.length, 2);
  value.copy(field, 4);
  return field;
}

function locateZipEntries(buffer) {
  const eocdOffset = buffer.lastIndexOf(
    Buffer.from([0x50, 0x4b, 0x05, 0x06]),
  );
  assert.ok(eocdOffset >= 0);
  const count = buffer.readUInt16LE(eocdOffset + 10);
  const centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = [];
  let cursor = centralOffset;

  for (let index = 0; index < count; index += 1) {
    assert.equal(buffer.readUInt32LE(cursor), 0x02014b50);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    entries.push({
      centralOffset: cursor,
      localOffset: buffer.readUInt32LE(cursor + 42),
    });
    cursor +=
      46 + nameLength + extraLength + commentLength;
  }

  return { centralOffset, eocdOffset, entries };
}

function insertLocalSectionBytes(
  buffer,
  insertionOffset,
  insertedBytes,
) {
  const original = locateZipEntries(buffer);
  assert.ok(insertionOffset <= original.centralOffset);
  const updated = Buffer.concat([
    buffer.subarray(0, insertionOffset),
    insertedBytes,
    buffer.subarray(insertionOffset),
  ]);
  const updatedCentralOffset =
    original.centralOffset + insertedBytes.length;
  const updatedEocdOffset =
    original.eocdOffset + insertedBytes.length;
  updated.writeUInt32LE(
    updatedCentralOffset,
    updatedEocdOffset + 16,
  );

  let cursor = updatedCentralOffset;
  for (let index = 0; index < original.entries.length; index += 1) {
    const localOffset = updated.readUInt32LE(cursor + 42);
    if (localOffset >= insertionOffset) {
      updated.writeUInt32LE(
        localOffset + insertedBytes.length,
        cursor + 42,
      );
    }
    cursor +=
      46 +
      updated.readUInt16LE(cursor + 28) +
      updated.readUInt16LE(cursor + 30) +
      updated.readUInt16LE(cursor + 32);
  }

  return updated;
}

function createOrphanLocalRecord() {
  const orphanArchive = createZip([{
    name: "orphan/payload.bin",
    data: "unreferenced",
    method: 0,
    versionNeeded: 10,
  }]);
  const { centralOffset } = locateZipEntries(orphanArchive);
  return orphanArchive.subarray(0, centralOffset);
}

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0
        ? 0xedb88320 ^ (value >>> 1)
        : value >>> 1;
    }
  }
  return (value ^ 0xffffffff) >>> 0;
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function moduleStub(filename, exports) {
  const stub = new Module(filename);
  stub.filename = filename;
  stub.loaded = true;
  stub.exports = exports;
  return stub;
}

function restoreEnvironment(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
