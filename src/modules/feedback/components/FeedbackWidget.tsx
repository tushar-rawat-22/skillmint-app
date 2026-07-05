"use client";

import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";

import { submitBetaFeedback } from "@/modules/feedback/services/feedbackRepository";
import { saveFeedbackLocally } from "@/modules/feedback/services/feedbackLocalStorage";
import type {
  FeedbackSentiment,
  FeedbackType,
} from "@/modules/feedback/types";

const MIN_FEEDBACK_LENGTH = 10;
const MAX_FEEDBACK_LENGTH = 1000;

const feedbackTypeOptions: Array<{
  value: FeedbackType;
  label: string;
}> = [
  {
    value: "bug",
    label: "Bug",
  },
  {
    value: "confusion",
    label: "Confusion",
  },
  {
    value: "ui",
    label: "UI issue",
  },
  {
    value: "idea",
    label: "Feature idea",
  },
  {
    value: "other",
    label: "Other",
  },
];

const sentimentOptions: Array<{
  value: FeedbackSentiment;
  label: string;
}> = [
  {
    value: "negative",
    label: "Negative",
  },
  {
    value: "neutral",
    label: "Neutral",
  },
  {
    value: "positive",
    label: "Positive",
  },
];

export default function FeedbackWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] =
    useState<FeedbackType>("bug");
  const [sentiment, setSentiment] =
    useState<FeedbackSentiment>("neutral");
  const [message, setMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] =
    useState<"success" | "warning" | "error">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const remainingCharacters = MAX_FEEDBACK_LENGTH - message.length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (trimmedMessage.length < MIN_FEEDBACK_LENGTH) {
      setStatusTone("error");
      setStatusMessage(
        `Please write at least ${MIN_FEEDBACK_LENGTH} characters.`,
      );
      return;
    }

    if (trimmedMessage.length > MAX_FEEDBACK_LENGTH) {
      setStatusTone("error");
      setStatusMessage(
        `Feedback must stay under ${MAX_FEEDBACK_LENGTH} characters.`,
      );
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("");

    const payload = {
      feedbackType,
      sentiment,
      message: trimmedMessage,
      pagePath: pathname || null,
    };
    const syncResult = await submitBetaFeedback(payload);

    if (syncResult.ok) {
      setStatusTone("success");
      setStatusMessage("Feedback sent. Thank you.");
      setMessage("");
      setIsSubmitting(false);
      return;
    }

    const localResult = saveFeedbackLocally(payload, syncResult.error);

    if (localResult.ok) {
      setStatusTone("warning");
      setStatusMessage("Saved in this browser. Account save will be added later.");
      setMessage("");
    } else {
      setStatusTone("error");
      setStatusMessage(localResult.error);
    }

    setIsSubmitting(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="beta-feedback-title"
          className="skillmint-fade-in mb-3 w-[calc(100vw-2rem)] max-w-md rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-white shadow-2xl shadow-black/40"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                id="beta-feedback-title"
                className="text-sm font-bold text-white"
              >
                Beta feedback
              </p>

              <p className="mt-1 text-xs leading-5 text-neutral-400">
                Report bugs, confusing moments, UI issues, or ideas.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg border border-neutral-800 px-2 py-1 text-xs font-semibold text-neutral-300 transition hover:border-neutral-600 hover:text-white"
            >
              Close
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-4 space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Type
                </span>

                <select
                  value={feedbackType}
                  onChange={(event) =>
                    setFeedbackType(event.target.value as FeedbackType)
                  }
                  className="mt-2 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-green-500"
                >
                  {feedbackTypeOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                  Sentiment
                </span>

                <select
                  value={sentiment}
                  onChange={(event) =>
                    setSentiment(event.target.value as FeedbackSentiment)
                  }
                  className="mt-2 w-full rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-green-500"
                >
                  {sentimentOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Message
              </span>

              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={MAX_FEEDBACK_LENGTH}
                rows={5}
                placeholder="What felt broken, confusing, or useful?"
                className="mt-2 w-full resize-none rounded-lg border border-neutral-800 bg-black px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-neutral-600 focus:border-green-500"
              />
            </label>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-neutral-500">
                {remainingCharacters} characters left
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-green-900 disabled:text-neutral-300"
              >
                {isSubmitting ? "Sending..." : "Send feedback"}
              </button>
            </div>

            {statusMessage && (
              <p className={`rounded-lg border p-3 text-sm leading-6 ${
                getStatusClassName(statusTone)
              }`}
              >
                {statusMessage}
              </p>
            )}
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="rounded-full border border-emerald-500/40 bg-neutral-950/95 px-5 py-3 text-sm font-bold text-emerald-100 shadow-xl shadow-black/30 transition-colors duration-200 hover:border-emerald-400 hover:bg-neutral-900 hover:text-white"
      >
        Feedback
      </button>
    </div>
  );
}

function getStatusClassName(
  tone: "success" | "warning" | "error",
): string {
  if (tone === "warning") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-100";
  }

  if (tone === "error") {
    return "border-red-500/30 bg-red-500/10 text-red-100";
  }

  return "border-green-500/30 bg-green-500/10 text-green-100";
}
