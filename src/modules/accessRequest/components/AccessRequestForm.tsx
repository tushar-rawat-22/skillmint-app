"use client";

import { FormEvent, useState } from "react";

import { premiumPrimaryCta } from "@/components/ui/premium";

type SubmissionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "success"; readonly duplicate: boolean }
  | { readonly kind: "error"; readonly message: string };

export default function AccessRequestForm() {
  const [state, setState] = useState<SubmissionState>({ kind: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === "submitting") return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email") ?? "");
    const intent = String(form.get("intent") ?? "");
    const website = String(form.get("website") ?? "");
    setState({ kind: "submitting" });

    try {
      const response = await fetch("/api/access-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, intent, website }),
      });
      const body = await response.json().catch(() => null) as
        | { readonly status?: string; readonly code?: string }
        | null;

      if (response.ok && body?.status === "received") {
        setState({ kind: "success", duplicate: false });
        formElement.reset();
        return;
      }
      if (response.ok && body?.status === "already_received") {
        setState({ kind: "success", duplicate: true });
        return;
      }
      if (response.status === 429) {
        setState({
          kind: "error",
          message: "Too many requests were sent from this connection. Try again later.",
        });
        return;
      }
      if (response.status === 400) {
        setState({
          kind: "error",
          message: "Check the email address and access type, then try again.",
        });
        return;
      }
      setState({
        kind: "error",
        message: "Access requests are temporarily unavailable. Your account was not created. Try again later.",
      });
    } catch {
      setState({
        kind: "error",
        message: "The request could not reach SkillMint. Check your connection and try again.",
      });
    }
  }

  return (
    <section aria-labelledby="request-access-title">
      <h2 id="request-access-title" className="text-2xl font-bold text-slate-950">
        Request access
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Tell us which workspace you need. A request does not create an account, and no resume is required.
      </p>

      <form className="mt-6 grid gap-5" onSubmit={submit}>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold text-slate-800">I want to use SkillMint as</legend>
          <div className="grid grid-cols-2 gap-3">
            {(["CANDIDATE", "RECRUITER"] as const).map((intent) => (
              <label
                key={intent}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-700"
              >
                <input
                  type="radio"
                  name="intent"
                  value={intent}
                  defaultChecked={intent === "CANDIDATE"}
                  required
                />
                {intent === "CANDIDATE" ? "Candidate" : "Recruiter"}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            required
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal text-slate-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            placeholder="you@example.com"
          />
        </label>

        <label className="hidden" aria-hidden="true">
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>

        <button
          type="submit"
          disabled={state.kind === "submitting"}
          className={premiumPrimaryCta}
        >
          {state.kind === "submitting" ? "Sending request…" : "Request access"}
        </button>
      </form>

      <div className="mt-4 min-h-12 text-sm leading-6" aria-live="polite">
        {state.kind === "success" ? (
          <p className="text-emerald-800">
            {state.duplicate
              ? "We already have this access request. No duplicate account or request was created."
              : "Request received. SkillMint will review access separately; no account has been created yet."}
          </p>
        ) : state.kind === "error" ? (
          <p className="text-rose-700">{state.message}</p>
        ) : null}
      </div>
    </section>
  );
}
