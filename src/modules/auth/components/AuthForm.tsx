"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  premiumInput,
  premiumPrimaryCta,
} from "@/components/ui/premium";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";

type AuthFormProps = {
  mode: "login" | "signup";
};

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const configStatus = useMemo(() => getSupabaseConfigStatus(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = getValidationError(email, password, mode);

    if (validationError) {
      setError(validationError);
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

    if (mode === "login") {
      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      setIsSubmitting(false);

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.push("/settings/data?import=1");
      router.refresh();
      return;
    }

    setMessage(
      "Account created. Check your email if confirmation is required, then use Data & privacy to import any anonymous browser workspace.",
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
        disabled={isSubmitting}
        className={`${premiumPrimaryCta} mt-5 w-full`}
      >
        {isSubmitting ? "Please wait..." : getSubmitLabel(mode)}
      </button>
    </form>
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

  if (mode === "signup" && password.length < 6) {
    return "Signup password must be at least 6 characters.";
  }

  return "";
}

function getSubmitLabel(mode: AuthFormProps["mode"]): string {
  return mode === "login" ? "Log in" : "Create account";
}
