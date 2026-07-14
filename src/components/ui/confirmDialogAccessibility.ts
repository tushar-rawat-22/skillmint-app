type DialogElement = {
  contains?: (...targets: never[]) => boolean;
  querySelectorAll?: (selector: string) => ArrayLike<FocusableElement>;
  focus?: (options?: { preventScroll?: boolean }) => void;
  isConnected?: boolean;
};

type FocusableElement = DialogElement & {
  closest?: (selector: string) => FocusableElement | null;
  matches?: (selector: string) => boolean;
  getAttribute?: (name: string) => string | null;
  hasAttribute?: (name: string) => boolean;
  getClientRects?: () => ArrayLike<unknown>;
  parentElement?: FocusableElement | null;
  tagName?: string;
  type?: string;
  disabled?: boolean;
};

type KeyboardEventLike = {
  key?: string;
  shiftKey?: boolean;
  isComposing?: boolean;
  preventDefault?: () => void;
  stopPropagation?: () => void;
};

type FocusEventLike = { target?: unknown };
type DocumentListener = (event: KeyboardEventLike & FocusEventLike) => void;

export type ConfirmDialogAccessibilityEnvironment = {
  addDocumentListener: (type: "keydown" | "focusin", listener: DocumentListener) => void;
  removeDocumentListener: (type: "keydown" | "focusin", listener: DocumentListener) => void;
  getActiveElement: () => unknown;
  getBody: () => unknown;
  getDocumentElement: () => unknown;
  getComputedStyle: (element: FocusableElement) => { display?: string; visibility?: string };
  schedule: (callback: () => void) => unknown;
  cancelScheduled: (handle: unknown) => void;
};

export type ConfirmDialogAccessibilitySessionInput = {
  dialog: DialogElement;
  getCancelElement: () => FocusableElement | null;
  getInitialFocusElement: () => FocusableElement | null;
  previouslyActiveElement: unknown;
  getIsProcessing: () => boolean;
  requestClose: () => void;
  environment: ConfirmDialogAccessibilityEnvironment;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "iframe",
  "object",
  "embed",
  "audio[controls]",
  "video[controls]",
  "[tabindex]",
  "[contenteditable]",
].join(",");

function safelyContains(container: DialogElement, target: unknown): boolean {
  try {
    return Boolean(target && container.contains?.(target as never));
  } catch {
    return false;
  }
}

function hasUnusableAncestor(element: FocusableElement): boolean {
  try {
    if (element.closest?.("[hidden], [aria-hidden='true'], [inert]")) return true;
  } catch {
    return true;
  }

  try {
    if (element.matches?.(":disabled")) return true;
  } catch {
    return true;
  }

  return false;
}

function hasHiddenStyle(
  element: FocusableElement,
  getComputedStyle: ConfirmDialogAccessibilityEnvironment["getComputedStyle"],
): boolean {
  let current: FocusableElement | null | undefined = element;
  const visited = new Set<FocusableElement>();

  while (current && !visited.has(current)) {
    visited.add(current);
    try {
      const style = getComputedStyle(current);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.visibility === "collapse"
      ) return true;
    } catch {
      return true;
    }

    try {
      current = current.parentElement;
    } catch {
      return true;
    }
  }

  return false;
}

function isUsable(
  element: FocusableElement | null,
  dialog: DialogElement,
  environment: ConfirmDialogAccessibilityEnvironment,
): element is FocusableElement {
  if (!element || !safelyContains(dialog, element)) return false;

  try {
    if (element.isConnected === false || element.disabled === true) return false;
    if (element.type?.toLowerCase() === "hidden") return false;
    const tabIndex = element.getAttribute?.("tabindex");
    if (tabIndex !== null && tabIndex !== undefined && Number(tabIndex) < 0) return false;
    if (
      element.getAttribute?.("contenteditable")?.toLowerCase() === "false" &&
      element.tagName?.toLowerCase() !== "input"
    ) return false;
    if (hasUnusableAncestor(element) || hasHiddenStyle(element, environment.getComputedStyle)) {
      return false;
    }
    if (typeof element.getClientRects === "function" && element.getClientRects().length === 0) {
      return false;
    }
    return typeof element.focus === "function";
  } catch {
    return false;
  }
}

function getFocusableElements(
  dialog: DialogElement,
  environment: ConfirmDialogAccessibilityEnvironment,
): FocusableElement[] {
  try {
    const candidates = dialog.querySelectorAll?.(FOCUSABLE_SELECTOR);
    return candidates
      ? Array.from(candidates).filter((element) => isUsable(element, dialog, environment))
      : [];
  } catch {
    return [];
  }
}

function focusElement(element: DialogElement, preventScroll = false): boolean {
  if (typeof element.focus !== "function") return false;
  try {
    element.focus(preventScroll ? { preventScroll: true } : undefined);
    return true;
  } catch {
    try {
      element.focus();
      return true;
    } catch {
      return false;
    }
  }
}

function isValidRestorationTarget(
  target: unknown,
  dialog: DialogElement,
  environment: ConfirmDialogAccessibilityEnvironment,
): target is FocusableElement {
  if (!target || target === environment.getBody() || target === environment.getDocumentElement()) {
    return false;
  }
  if (safelyContains(dialog, target)) return false;

  const element = target as FocusableElement;
  try {
    if (element.isConnected === false || element.disabled === true) return false;
    if (typeof element.focus !== "function") return false;
    if (hasUnusableAncestor(element) || hasHiddenStyle(element, environment.getComputedStyle)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function startConfirmDialogAccessibilitySession(
  input: ConfirmDialogAccessibilitySessionInput,
): () => void {
  let dialog: DialogElement;
  let environment: ConfirmDialogAccessibilityEnvironment;
  try {
    dialog = input.dialog;
    environment = input.environment;
    if (!dialog || !environment) return () => undefined;
  } catch {
    return () => undefined;
  }

  let active = true;
  let scheduledHandle: unknown;
  let hasScheduledHandle = false;
  let keyListenerInstalled = false;
  let focusListenerInstalled = false;
  let redirectingFocus = false;
  let closeRequested = false;
  let restored = false;

  const focusFallback = (preferLast = false) => {
    const focusable = getFocusableElements(dialog, environment);
    const target = preferLast ? focusable.at(-1) : focusable[0];
    if (!target || !focusElement(target)) focusElement(dialog);
  };

  const handleKeyDown: DocumentListener = (event) => {
    try {
      if (!active) return;
      if (event.key === "Escape") {
        if (event.isComposing) return;
        event.preventDefault?.();
        event.stopPropagation?.();
        if (!input.getIsProcessing() && !closeRequested) {
          closeRequested = true;
          try { input.requestClose(); } catch { /* Cleanup remains available. */ }
        }
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusableElements(dialog, environment);
      const activeElement = environment.getActiveElement();
      const activeIndex = focusable.indexOf(activeElement as FocusableElement);
      const targetIndex = activeIndex < 0
        ? event.shiftKey ? focusable.length - 1 : 0
        : event.shiftKey
          ? (activeIndex - 1 + focusable.length) % focusable.length
          : (activeIndex + 1) % focusable.length;

      event.preventDefault?.();
      const target = focusable[targetIndex];
      if (!target || !focusElement(target)) focusElement(dialog);
    } catch {
      // Browser or cross-realm DOM failures must not escape the session.
    }
  };

  const handleFocusIn: DocumentListener = (event) => {
    if (!active || redirectingFocus) return;
    try {
      const target = event.target ?? environment.getActiveElement();
      if (safelyContains(dialog, target)) return;
      redirectingFocus = true;
      focusFallback();
    } catch {
      // Focus containment is best effort when DOM access is unavailable.
    } finally {
      redirectingFocus = false;
    }
  };

  try {
    environment.addDocumentListener("keydown", handleKeyDown);
    keyListenerInstalled = true;
    environment.addDocumentListener("focusin", handleFocusIn);
    focusListenerInstalled = true;
    scheduledHandle = environment.schedule(() => {
      if (!active || dialog.isConnected === false) return;
      try {
        const currentActive = environment.getActiveElement();
        if (safelyContains(dialog, currentActive)) return;
        const customTarget = input.getInitialFocusElement();
        if (isUsable(customTarget, dialog, environment) && focusElement(customTarget)) return;
        const cancelTarget = input.getCancelElement();
        if (isUsable(cancelTarget, dialog, environment) && focusElement(cancelTarget)) return;
        focusFallback();
      } catch {
        // Initial focus is best effort and must never break rendering.
      }
    });
    hasScheduledHandle = true;
  } catch {
    active = false;
    try {
      if (hasScheduledHandle) environment.cancelScheduled(scheduledHandle);
    } catch { /* Continue partial cleanup. */ }
    try {
      if (keyListenerInstalled) environment.removeDocumentListener("keydown", handleKeyDown);
    } catch { /* Continue partial cleanup. */ }
    try {
      if (focusListenerInstalled) environment.removeDocumentListener("focusin", handleFocusIn);
    } catch { /* Partial setup is already inactive. */ }
    return () => undefined;
  }

  return () => {
    if (!active && restored) return;
    active = false;
    try {
      if (hasScheduledHandle) environment.cancelScheduled(scheduledHandle);
    } catch { /* Continue cleanup. */ }
    try {
      if (keyListenerInstalled) environment.removeDocumentListener("keydown", handleKeyDown);
    } catch { /* Continue cleanup. */ }
    try {
      if (focusListenerInstalled) environment.removeDocumentListener("focusin", handleFocusIn);
    } catch { /* Continue cleanup. */ }
    redirectingFocus = false;
    closeRequested = true;

    if (restored) return;
    restored = true;
    try {
      if (isValidRestorationTarget(input.previouslyActiveElement, dialog, environment)) {
        focusElement(input.previouslyActiveElement, true);
      }
    } catch {
      // Restoration is deliberately best effort.
    }
  };
}
