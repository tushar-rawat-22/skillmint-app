"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useId,
  type RefObject,
  type ReactNode,
} from "react";

import {
  premiumDangerCta,
  premiumSecondaryCta,
} from "@/components/ui/premium";
import { startConfirmDialogAccessibilitySession } from "@/components/ui/confirmDialogAccessibility";

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
  initialFocusRef?: RefObject<HTMLElement | null>;
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
  initialFocusRef,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  const isProcessingRef = useRef(isProcessing);
  const initialFocusRefRef = useRef(initialFocusRef);
  const titleId = useId();

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    isProcessingRef.current = isProcessing;
    initialFocusRefRef.current = initialFocusRef;
  }, [initialFocusRef, isProcessing, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) return;

    return startConfirmDialogAccessibilitySession({
      dialog,
      getCancelElement: () => cancelButtonRef.current,
      getInitialFocusElement: () => initialFocusRefRef.current?.current ?? null,
      previouslyActiveElement: document.activeElement,
      getIsProcessing: () => isProcessingRef.current,
      requestClose: () => onCloseRef.current(),
      environment: {
        addDocumentListener: (type, listener) => document.addEventListener(type, listener as EventListener),
        removeDocumentListener: (type, listener) => document.removeEventListener(type, listener as EventListener),
        getActiveElement: () => document.activeElement,
        getBody: () => document.body,
        getDocumentElement: () => document.documentElement,
        getComputedStyle: (element) => window.getComputedStyle(element as unknown as Element),
        schedule: (callback) => {
          try {
            return { kind: "frame", id: window.requestAnimationFrame(callback) };
          } catch {
            return { kind: "timer", id: window.setTimeout(callback, 0) };
          }
        },
        cancelScheduled: (handle) => {
          const scheduled = handle as { kind?: string; id?: number } | null;
          if (scheduled?.kind === "frame" && typeof scheduled.id === "number") {
            window.cancelAnimationFrame(scheduled.id);
          } else if (scheduled?.kind === "timer" && typeof scheduled.id === "number") {
            window.clearTimeout(scheduled.id);
          }
        },
      },
    });
  }, [isOpen]);

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
        aria-labelledby={titleId}
        aria-busy={isProcessing}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.2)]"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id={titleId}
            className="text-2xl font-black"
          >
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            aria-label={`Close ${title}`}
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
            ref={cancelButtonRef}
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
