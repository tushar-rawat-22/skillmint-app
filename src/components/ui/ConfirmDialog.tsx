"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import {
  premiumDangerCta,
  premiumSecondaryCta,
} from "@/components/ui/premium";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  isProcessing?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmDialog({
  isOpen,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  isProcessing = false,
  confirmDisabled = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousActiveElementRef.current = document.activeElement;
    const timeoutId = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button, [href], input, textarea, select, [tabindex]:not([tabindex='-1'])",
      );
      const elements = focusableElements
        ? Array.from(focusableElements).filter((element) => !element.hasAttribute("disabled"))
        : [];
      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];

      if (!firstElement || !lastElement) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("keydown", handleKeyDown);
      const previousActiveElement = previousActiveElementRef.current;

      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.2)]"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="confirm-dialog-title"
            className="text-2xl font-black"
          >
            {title}
          </h2>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm font-bold text-slate-600 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <div className="mt-4 text-sm leading-6 text-slate-700">
          {children}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className={premiumSecondaryCta}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing || confirmDisabled}
            className={premiumDangerCta}
          >
            {isProcessing ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
