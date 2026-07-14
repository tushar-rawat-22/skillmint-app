import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(repoRoot, "src");

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const helperPath = path.join(srcRoot, "components/ui/confirmDialogAccessibility.ts");
const componentPath = path.join(srcRoot, "components/ui/ConfirmDialog.tsx");
const settingsPath = path.join(srcRoot, "app/settings/data/page.tsx");
const resumePath = path.join(srcRoot, "app/resume/page.tsx");
const clearPath = path.join(srcRoot, "components/settings/ClearWorkspaceCard.tsx");
const helperSource = fs.readFileSync(helperPath, "utf8");
const componentSource = fs.readFileSync(componentPath, "utf8");
const settingsSource = fs.readFileSync(settingsPath, "utf8");
const resumeSource = fs.readFileSync(resumePath, "utf8");
const clearSource = fs.readFileSync(clearPath, "utf8");
const { startConfirmDialogAccessibilitySession } = require(helperPath);

const tests = [];
function test(name, callback) { tests.push({ name, callback }); }

function element(name, options = {}) {
  const attributes = new Map(Object.entries(options.attributes ?? {}));
  const value = {
    name,
    tagName: options.tagName ?? "BUTTON",
    type: options.type,
    disabled: options.disabled ?? false,
    isConnected: options.isConnected ?? true,
    hidden: options.hidden ?? false,
    ariaHidden: options.ariaHidden ?? false,
    inert: options.inert ?? false,
    display: options.display ?? "block",
    visibility: options.visibility ?? "visible",
    opacity: options.opacity ?? "1",
    rects: options.rects ?? 1,
    parentElement: options.parentElement ?? null,
    focusCalls: [],
    getAttribute(key) { return attributes.has(key) ? attributes.get(key) : null; },
    hasAttribute(key) { return attributes.has(key); },
    matches(selector) {
      if (options.throwMatches) throw new Error("matches");
      return selector === ":disabled" && (this.disabled || options.fieldsetDisabled);
    },
    closest(selector) {
      if (options.throwClosest) throw new Error("closest");
      let current = value;
      while (current) {
        if (selector.includes("[hidden]") && current.hidden) return current;
        if (selector.includes("[aria-hidden='true']") && current.ariaHidden) return current;
        if (selector.includes("[inert]") && current.inert) return current;
        current = current.parentElement;
      }
      return null;
    },
    getClientRects() {
      if (options.throwRects) throw new Error("rects");
      return Array.from({ length: this.rects });
    },
    focus(focusOptions) {
      this.focusCalls.push(focusOptions);
      if (options.throwFocus || (options.throwOptionFocus && focusOptions)) throw new Error("focus");
      if (this.environment) {
        this.environment.activeElement = this;
        if (this.environment.dispatchOnFocus) this.environment.dispatch("focusin", { target: this });
      }
    },
  };
  return value;
}

function fixture(options = {}) {
  const listeners = { keydown: new Set(), focusin: new Set() };
  const scheduled = [];
  const events = [];
  const body = element("body");
  const html = element("html");
  const outside = element("trigger");
  const dialog = element("dialog", { tagName: "DIV" });
  dialog.children = [];
  dialog.contains = (target) => target === dialog || dialog.children.includes(target);
  dialog.querySelectorAll = () => [...dialog.children];
  const environment = {
    activeElement: options.activeElement ?? outside,
    dispatchOnFocus: options.dispatchOnFocus ?? false,
    dispatch(type, event) {
      for (const listener of [...listeners[type]]) listener(event);
    },
    addDocumentListener(type, listener) {
      events.push(`add:${type}`);
      if (options.throwAdd === type) throw new Error("add");
      listeners[type].add(listener);
    },
    removeDocumentListener(type, listener) {
      events.push(`remove:${type}`);
      if (options.throwRemove === type) throw new Error("remove");
      listeners[type].delete(listener);
    },
    getActiveElement() {
      if (options.throwActive) throw new Error("active");
      return this.activeElement;
    },
    getBody: () => body,
    getDocumentElement: () => html,
    getComputedStyle(target) {
      if (options.throwStyle || target.throwStyle) throw new Error("style");
      return { display: target.display, visibility: target.visibility, opacity: target.opacity };
    },
    schedule(callback) {
      events.push("schedule");
      if (options.throwSchedule) throw new Error("schedule");
      const task = { callback, canceled: false };
      scheduled.push(task);
      return task;
    },
    cancelScheduled(task) {
      events.push("cancel");
      if (options.throwCancel) throw new Error("cancel");
      task.canceled = true;
    },
  };
  for (const target of [body, html, outside, dialog]) target.environment = environment;
  function add(target) {
    if (target.parentElement) {
      target.parentElement.parentElement = dialog;
      target.parentElement.environment = environment;
    } else {
      target.parentElement = dialog;
    }
    target.environment = environment;
    dialog.children.push(target);
    return target;
  }
  function runScheduled() {
    for (const task of scheduled) if (!task.canceled) task.callback();
  }
  function key(key, extra = {}) {
    const event = {
      key,
      prevented: false,
      stopped: false,
      preventDefault() { this.prevented = true; },
      stopPropagation() { this.stopped = true; },
      ...extra,
    };
    environment.dispatch("keydown", event);
    return event;
  }
  return { dialog, outside, body, html, environment, listeners, scheduled, events, add, runScheduled, key };
}

function start(value, options = {}) {
  const state = {
    cancel: options.cancel ?? null,
    custom: options.custom ?? null,
    processing: options.processing ?? false,
    closes: 0,
    close: options.close ?? (() => { state.closes += 1; }),
  };
  const cleanup = startConfirmDialogAccessibilitySession({
    dialog: value.dialog,
    getCancelElement: () => state.cancel,
    getInitialFocusElement: () => state.custom,
    previouslyActiveElement: options.previous ?? value.outside,
    getIsProcessing: () => state.processing,
    requestClose: () => state.close(),
    environment: value.environment,
  });
  return { state, cleanup };
}

test("1 caller discovery and optional API compatibility", () => {
  const callers = [
    [settingsPath, settingsSource, 3],
    [resumePath, resumeSource, 1],
    [clearPath, clearSource, 1],
  ];
  assert.deepEqual(callers.map(([file]) => path.relative(repoRoot, file)), [
    "src/app/settings/data/page.tsx",
    "src/app/resume/page.tsx",
    "src/components/settings/ClearWorkspaceCard.tsx",
  ]);
  for (const [, source, count] of callers) {
    assert.equal((source.match(/<ConfirmDialog\b/g) ?? []).length, count);
    for (const prop of ["isOpen", "title", "confirmLabel", "onConfirm", "onClose"]) {
      assert.match(source, new RegExp(`${prop}=`));
    }
  }
  assert.match(componentSource, /initialFocusRef\?: RefObject<HTMLElement \| null>/);
  assert.doesNotMatch(resumeSource + clearSource, /initialFocusRef=/);
  assert.match(settingsSource, /onClose=\{\(\) => setShowBrowserClearDialog\(false\)\}/);
  assert.doesNotMatch(resumeSource + clearSource + settingsSource, /useCallback\([^)]*onClose/);
});

test("2 unique IDs and lifecycle are component-owned without a duplicate trap", () => {
  assert.match(componentSource, /const titleId = useId\(\)/);
  assert.match(componentSource, /aria-labelledby=\{titleId\}/);
  assert.match(componentSource, /id=\{titleId\}/);
  assert.match(componentSource, /startConfirmDialogAccessibilitySession/);
  assert.match(componentSource, /\}, \[isOpen\]\);/);
  assert.doesNotMatch(componentSource, /\[isOpen,\s*(?:onClose|isProcessing)/);
  assert.doesNotMatch(componentSource, /function handleKeyDown|function keepFocusInDialog|querySelectorAll<HTMLElement>/);
  assert.doesNotMatch(componentSource, /confirm-dialog-title/);
});

test("3 scheduled initial focus follows custom, Cancel, child, and dialog policy", () => {
  const value = fixture();
  const first = value.add(element("first"));
  const cancel = value.add(element("cancel"));
  const custom = value.add(element("custom", { tagName: "INPUT" }));
  const session = start(value, { cancel, custom });
  assert.equal(custom.focusCalls.length, 0);
  value.runScheduled();
  assert.equal(custom.focusCalls.length, 1);
  assert.equal(custom.focusCalls[0], undefined);
  session.cleanup();

  for (const invalid of [
    element("outside-custom"),
    value.add(element("disconnected", { isConnected: false })),
    value.add(element("hidden", { hidden: true })),
    value.add(element("inert", { inert: true })),
    value.add(element("disabled", { disabled: true })),
  ]) {
    const next = fixture();
    const nextCancel = next.add(element("cancel"));
    if (invalid.name !== "outside-custom") next.add(invalid);
    const run = start(next, { cancel: nextCancel, custom: invalid });
    next.runScheduled();
    assert.equal(next.environment.activeElement, nextCancel);
    run.cleanup();
  }

  const late = fixture();
  const lateCancel = late.add(element("cancel"));
  const lateCustom = late.add(element("late", { tagName: "INPUT" }));
  const lateSession = start(late, { cancel: lateCancel });
  lateSession.state.custom = lateCustom;
  late.runScheduled();
  assert.equal(late.environment.activeElement, lateCustom);
  lateSession.cleanup();

  const occupied = fixture();
  const occupiedCancel = occupied.add(element("cancel"));
  const occupiedInput = occupied.add(element("input", { tagName: "INPUT" }));
  const occupiedSession = start(occupied, { cancel: occupiedCancel });
  occupied.environment.activeElement = occupiedInput;
  occupied.runScheduled();
  assert.equal(occupiedCancel.focusCalls.length, 0);
  occupiedSession.cleanup();

  const canceled = fixture();
  const canceledTarget = canceled.add(element("cancel"));
  const canceledSession = start(canceled, { cancel: canceledTarget });
  canceledSession.cleanup();
  canceled.runScheduled();
  assert.equal(canceledTarget.focusCalls.length, 0);

  const noCancel = fixture();
  const child = noCancel.add(element("child"));
  const childSession = start(noCancel);
  noCancel.runScheduled();
  assert.equal(noCancel.environment.activeElement, child);
  childSession.cleanup();
  const empty = fixture();
  const emptySession = start(empty);
  empty.runScheduled();
  assert.equal(empty.environment.activeElement, empty.dialog);
  emptySession.cleanup();

  const throwing = fixture();
  throwing.add(element("throw", { throwFocus: true }));
  assert.doesNotThrow(() => { const run = start(throwing); throwing.runScheduled(); run.cleanup(); });
  assert.equal(first.name, "first");
});

test("4 account input ref is isolated and confirmation behavior is preserved", () => {
  assert.equal((settingsSource.match(/accountDeleteConfirmationInputRef/g) ?? []).length, 3);
  assert.match(settingsSource, /useRef<HTMLInputElement>\(null\)/);
  assert.match(settingsSource, /initialFocusRef=\{accountDeleteConfirmationInputRef\}/);
  assert.match(settingsSource, /ref=\{accountDeleteConfirmationInputRef\}[\s\S]*?id="account-delete-confirmation"/);
  assert.equal((settingsSource.match(/initialFocusRef=/g) ?? []).length, 1);
  assert.match(settingsSource, /const ACCOUNT_DELETE_CONFIRMATION = "DELETE MY ACCOUNT"/);
  assert.match(settingsSource, /accountDeleteConfirmation !== ACCOUNT_DELETE_CONFIRMATION/);
  assert.match(settingsSource, /onChange=\{\(event\) => setAccountDeleteConfirmation\(event\.target\.value\)\}/);
  assert.match(settingsSource, /async function handleDeleteAccount\(\)[\s\S]*?fetch\("\/api\/account\/delete"/);
});

test("5 Tab and Shift+Tab use current DOM order and dynamic usability", () => {
  const value = fixture();
  const first = value.add(element("first"));
  const middle = value.add(element("middle"));
  const last = value.add(element("last"));
  const session = start(value, { cancel: middle });
  value.environment.activeElement = middle;
  assert.equal(value.key("Tab", { shiftKey: true }).prevented, true);
  assert.equal(value.environment.activeElement, first);
  value.environment.activeElement = middle;
  assert.equal(value.key("Tab").prevented, true);
  assert.equal(value.environment.activeElement, last);
  value.environment.activeElement = last;
  assert.equal(value.key("Tab").prevented, true);
  assert.equal(value.environment.activeElement, first);
  value.environment.activeElement = first;
  assert.equal(value.key("Tab", { shiftKey: true }).prevented, true);
  assert.equal(value.environment.activeElement, last);
  value.environment.activeElement = value.outside;
  value.key("Tab");
  assert.equal(value.environment.activeElement, first);
  value.environment.activeElement = value.outside;
  value.key("Tab", { shiftKey: true });
  assert.equal(value.environment.activeElement, last);
  middle.disabled = true;
  value.environment.activeElement = middle;
  value.key("Tab");
  assert.equal(value.environment.activeElement, first);
  first.disabled = true;
  const added = value.add(element("added"));
  value.environment.activeElement = added;
  value.key("Tab");
  assert.equal(value.environment.activeElement, last);
  value.dialog.children = [last];
  value.environment.activeElement = last;
  value.key("Tab");
  assert.equal(value.environment.activeElement, last);
  value.key("Tab", { shiftKey: true });
  assert.equal(value.environment.activeElement, last);
  value.dialog.children = [];
  value.key("Tab");
  assert.equal(value.environment.activeElement, value.dialog);
  session.cleanup();
});

test("6 focusability excludes unusable controls without excluding opacity zero", () => {
  const cases = [
    { disabled: true }, { fieldsetDisabled: true }, { hidden: true },
    { parentElement: element("hidden-parent", { hidden: true }) }, { ariaHidden: true },
    { parentElement: element("aria-parent", { ariaHidden: true }) }, { inert: true },
    { parentElement: element("inert-parent", { inert: true }) }, { type: "hidden", tagName: "INPUT" },
    { attributes: { tabindex: "-1" } }, { display: "none" }, { visibility: "hidden" },
    { visibility: "collapse" }, { isConnected: false }, { rects: 0 },
  ];
  for (const options of cases) {
    const value = fixture();
    const unusable = value.add(element("unusable", options));
    const usable = value.add(element("usable"));
    const session = start(value, { custom: unusable, cancel: usable });
    value.runScheduled();
    assert.equal(value.environment.activeElement, usable);
    session.cleanup();
  }
  const transparent = fixture();
  const opacityZero = transparent.add(element("transparent", { opacity: "0" }));
  const transparentSession = start(transparent, { custom: opacityZero });
  transparent.runScheduled();
  assert.equal(transparent.environment.activeElement, opacityZero);
  transparentSession.cleanup();
});

test("7 programmatic focus is contained defensively without global Node", () => {
  const value = fixture({ dispatchOnFocus: true });
  const first = value.add(element("first"));
  const session = start(value);
  value.environment.dispatch("focusin", { target: first });
  assert.equal(first.focusCalls.length, 0);
  value.environment.dispatch("focusin", { target: value.outside });
  assert.equal(value.environment.activeElement, first);
  value.environment.dispatch("focusin", { target: null });
  assert.equal(value.environment.activeElement, first);
  assert.doesNotThrow(() => value.environment.dispatch("focusin", { target: { name: "foreign" } }));
  session.cleanup();
  const empty = fixture();
  const emptySession = start(empty);
  empty.environment.dispatch("focusin", { target: empty.outside });
  assert.equal(empty.environment.activeElement, empty.dialog);
  emptySession.cleanup();
  const throwing = fixture();
  throwing.dialog.contains = () => { throw new Error("contains"); };
  throwing.add(element("throws-focus", { throwFocus: true }));
  const throwingSession = start(throwing);
  assert.doesNotThrow(() => throwing.environment.dispatch("focusin", { target: throwing.outside }));
  throwingSession.cleanup();
  assert.equal(typeof globalThis.Node, "undefined");
});

test("8 Escape uses latest state/callback, respects IME, and closes once", () => {
  const value = fixture();
  const session = start(value);
  const composing = value.key("Escape", { isComposing: true });
  assert.equal(composing.prevented, false);
  assert.equal(session.state.closes, 0);
  session.state.processing = true;
  const blocked = value.key("Escape");
  assert.equal(blocked.prevented, true);
  assert.equal(blocked.stopped, true);
  assert.equal(session.state.closes, 0);
  session.state.processing = false;
  let replacementCalls = 0;
  session.state.close = () => { replacementCalls += 1; };
  const idle = value.key("Escape");
  assert.equal(idle.prevented, true);
  assert.equal(idle.stopped, true);
  value.key("Escape");
  assert.equal(replacementCalls, 1);
  assert.equal(value.key("Enter").prevented, false);
  session.cleanup();
  const throwing = fixture();
  const throwingSession = start(throwing, { close: () => { throw new Error("close"); } });
  assert.doesNotThrow(() => throwing.key("Escape"));
  assert.doesNotThrow(throwingSession.cleanup);
});

test("9 processing changes do not reinstall or replay the session", () => {
  const value = fixture();
  const cancel = value.add(element("cancel"));
  const session = start(value, { cancel });
  value.runScheduled();
  assert.equal(value.events.filter((event) => event === "schedule").length, 1);
  const addCount = value.events.filter((event) => event.startsWith("add:")).length;
  session.state.processing = true;
  cancel.disabled = true;
  value.key("Tab");
  assert.equal(value.environment.activeElement, value.dialog);
  assert.equal(value.events.filter((event) => event.startsWith("add:")).length, addCount);
  assert.equal(cancel.focusCalls.length, 1);
  assert.equal(value.outside.focusCalls.length, 0);
  session.cleanup();
  assert.match(componentSource, /aria-busy=\{isProcessing\}/);
});

test("10 cleanup removes containment before safe one-time restoration", () => {
  const value = fixture();
  const session = start(value);
  session.cleanup();
  assert(value.events.indexOf("cancel") < value.events.indexOf("remove:keydown"));
  assert(value.events.indexOf("remove:keydown") < value.events.indexOf("remove:focusin"));
  assert.equal(value.outside.focusCalls.length, 1);
  assert.deepEqual(value.outside.focusCalls[0], { preventScroll: true });
  session.cleanup();
  assert.equal(value.outside.focusCalls.length, 1);
  for (const kind of ["body", "html", "dialog", "gone", "hidden", "inert", "disabled"]) {
    const next = fixture();
    const previous = kind === "body" ? next.body
      : kind === "html" ? next.html
      : kind === "dialog" ? next.dialog
      : element(kind, {
          isConnected: kind !== "gone",
          hidden: kind === "hidden",
          inert: kind === "inert",
          disabled: kind === "disabled",
        });
    previous.environment = next.environment;
    const run = start(next, { previous });
    run.cleanup();
    assert.equal(previous.focusCalls.length, 0);
  }
  const fallback = fixture();
  const trigger = element("trigger", { throwOptionFocus: true });
  trigger.environment = fallback.environment;
  const fallbackSession = start(fallback, { previous: trigger });
  assert.doesNotThrow(fallbackSession.cleanup);
  assert.equal(trigger.focusCalls.length, 2);
  const partial = fixture({ throwAdd: "focusin", throwCancel: true, throwRemove: "keydown" });
  const partialSession = start(partial);
  assert.doesNotThrow(partialSession.cleanup);
  assert.doesNotThrow(partialSession.cleanup);
});

test("11 Strict Mode rehearsal leaves only the second session active", () => {
  const value = fixture();
  const cancel = value.add(element("cancel"));
  const first = start(value, { cancel });
  first.cleanup();
  const second = start(value, { cancel });
  value.runScheduled();
  assert.equal(cancel.focusCalls.length, 1);
  value.key("Escape");
  assert.equal(first.state.closes, 0);
  assert.equal(second.state.closes, 1);
  assert.equal(value.listeners.keydown.size, 1);
  second.cleanup();
  assert.equal(value.listeners.keydown.size, 0);
  assert.equal(value.listeners.focusin.size, 0);
  assert(first.state.closes + second.state.closes === 1);
});

test("12 ARIA integration preserves naming and modal semantics", () => {
  for (const source of [componentSource]) {
    assert.match(source, /role="dialog"/);
    assert.match(source, /aria-modal="true"/);
    assert.match(source, /aria-labelledby=\{titleId\}/);
    assert.match(source, /tabIndex=\{-1\}/);
    assert.match(source, /aria-busy=\{isProcessing\}/);
    assert.match(source, /aria-label=\{`Close \$\{title\}`\}/);
    assert.equal((source.match(/type="button"/g) ?? []).length, 3);
    assert.match(source, /ref=\{cancelButtonRef\}/);
    assert.doesNotMatch(source, /aria-describedby|alertdialog|<dialog\b|onClick=\{onClose\}[^>]*role="presentation"/);
  }
});

test("13 boundaries keep the helper DOM-only and frozen logic untouched", () => {
  assert.doesNotMatch(helperSource, /from ["']react|require\(["']react/);
  assert.doesNotMatch(helperSource, /@\/lib\/storage|supabase|accountDeletion|fetch\(|localStorage|sessionStorage/iu);
  assert.doesNotMatch(componentSource, /localStorage|sessionStorage|Supabase|account\/delete/);
  assert.equal(Object.keys(startConfirmDialogAccessibilitySession).length, 0);
  assert.equal(fs.existsSync(path.join(repoRoot, "package-lock.json")), true);
});

for (const { name, callback } of tests) {
  try {
    await callback();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

console.log(`PASS ${tests.length} confirm-dialog accessibility fixture groups`);
console.log("LIMITATIONS offline fixtures do not prove VoiceOver, NVDA, or JAWS behavior; Safari, Chrome, or Firefox focus behavior; uninterrupted rendered typing; or a full React Strict Mode renderer.");
console.log("LIMITATIONS background inertness, touch/body-scroll locking, simultaneous independently opened modals, destructive-operation race safety, legal compliance, and production readiness remain unproved or deferred.");
