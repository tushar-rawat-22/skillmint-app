"use client";

import Script from "next/script";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  premiumInput,
  premiumPrimaryCta,
} from "@/components/ui/premium";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import {
  submitAuthCredentials,
} from "@/modules/auth/services/authCredentials";
import {
  getNewPasswordLengthMessage,
  isNewPasswordAllowed,
} from "@/modules/auth/services/passwordPolicy";

const CAPTCHA_REQUIRED_MESSAGE =
  "Please complete the security check before creating an account.";

type AuthFormProps =
  | { mode: "login" }
  | {
      mode: "signup";
      publicSignupEnabled: boolean;
      emailRedirectTo: string | null;
    };

export default function AuthForm(props: AuthFormProps) {
  const { mode } = props;
  const router = useRouter();
  const configStatus = useMemo(() => getSupabaseConfigStatus(), []);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (mode !== "signup") return;

    const handleToken = (event: Event) => {
      setCaptchaToken((event as CustomEvent<string>).detail ?? "");
    };

    window.addEventListener("skillmint-signup-turnstile", handleToken);
    return () => window.removeEventListener("skillmint-signup-turnstile", handleToken);
  }, [mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      mode === "signup" &&
      props.publicSignupEnabled !== true
    ) {
      setError("Account creation is currently closed.");
      setMessage("");
      return;
    }

    const validationError = getValidationError(email, password, mode);

    if (validationError) {
      setError(validationError);
      setMessage("");
      return;
    }

    if (mode === "signup" && turnstileSiteKey && !captchaToken) {
      setError(CAPTCHA_REQUIRED_MESSAGE);
      setMessage("");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!configStatus.isConfigured || !supabase) {
      setError(configStatus.message);
      setMessage("");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    const result = await submitAuthCredentials(
      supabase,
      mode === "login"
        ? { mode, email, password }
        : {
            mode,
            email,
            password,
            publicSignupEnabled: props.publicSignupEnabled,
            emailRedirectTo: props.emailRedirectTo,
            captchaToken: captchaToken || undefined,
          },
    );

    try {
      if (result.status === "signup_disabled") {
        setError("Account creation is currently closed.");
        return;
      }

      if (result.status === "failure") {
        setError(
          mode === "login"
            ? "Login could not be completed. Please try again."
            : "Account creation could not be completed. Please try again.",
        );
        return;
      }

      if (mode === "login") {
        router.push("/auth/persona");
        router.refresh();
        return;
      }

      if (result.sessionCreated) {
        router.push("/auth/persona");
        router.refresh();
        return;
      }

      setMessage(
        "Account created. Check your email if confirmation is required, then use Data & privacy to import any anonymous browser workspace.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (
    mode === "signup" &&
    props.publicSignupEnabled !== true
  ) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <h2 className="text-xl font-bold text-slate-950">
          Account creation is currently closed
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Existing users can continue to log in.
        </p>
      </section>
    );
  }

  if (!configStatus.isConfigured) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h2 className="text-xl font-bold">
          Account sync is unavailable
        </h2>

        <p className="mt-3 text-sm leading-6">
          {configStatus.message}
        </p>

        <div className="mt-4 rounded-2xl border border-amber-200 bg-white p-4 text-sm">
          <p className="font-semibold">
            Missing environment values
          </p>

          <ul className="mt-2 space-y-1">
            {configStatus.missingEnvVars.map((envVarName) => (
              <li key={envVarName}>
                {envVarName}
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <>
      {mode === "signup" && turnstileSiteKey ? (
        <>
          <Script id="skillmint-signup-turnstile-callbacks" strategy="afterInteractive">
            {`window.skillmintSignupTurnstileSuccess = function(token) { window.dispatchEvent(new CustomEvent('skillmint-signup-turnstile', { detail: token })); }; window.skillmintSignupTurnstileExpired = function() { window.dispatchEvent(new CustomEvent('skillmint-signup-turnstile', { detail: '' })); };`}
          </Script>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
          />
        </>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
      >
        <div>
          <label
            htmlFor="email"
            className="text-sm font-semibold text-slate-700"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={`mt-2 ${premiumInput}`}
            placeholder="you@example.com"
          />
        </div>

        <div className="mt-4">
          <label
            htmlFor="password"
            className="text-sm font-semibold text-slate-700"
          >
            Password
          </label>

          <input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`mt-2 ${premiumInput}`}
            placeholder="Enter your password"
          />
        </div>

        {mode === "signup" && turnstileSiteKey ? (
          <div className="mt-4" aria-label="Security check">
            <div
              className="cf-turnstile"
              data-sitekey={turnstileSiteKey}
              data-size="flexible"
              data-callback="skillmintSignupTurnstileSuccess"
              data-expired-callback="skillmintSignupTurnstileExpired"
              data-error-callback="skillmintSignupTurnstileExpired"
            />
          </div>
        ) : null}

        {error && (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || Boolean(mode === "signup" && turnstileSiteKey && !captchaToken)}
          className={`${premiumPrimaryCta} mt-5 w-full`}
        >
          {isSubmitting ? "Please wait..." : getSubmitLabel(mode)}
        </button>
      </form>
    </>
  );
}

function getValidationError(
  email: string,
  password: string,
  mode: AuthFormProps["mode"],
): string {
  if (!email.trim()) {
    return "Email is required.";
  }

  if (!password) {
    return "Password is required.";
  }

  if (mode === "signup" && !isNewPasswordAllowed(password)) {
    return getNewPasswordLengthMessage();
  }

  return "";
}

function getSubmitLabel(mode: AuthFormProps["mode"]): string {
  return mode === "login" ? "Log in" : "Create account";
}
