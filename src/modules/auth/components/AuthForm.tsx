"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import { clearSkillMintWorkspace } from "@/lib/storage/clearSkillMintWorkspace";

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

    clearSkillMintWorkspace();

    if (data.session) {
      router.push("/setup");
      router.refresh();
      return;
    }

    setMessage("Account created. Start by choosing your career direction.");
  }

  if (!configStatus.isConfigured) {
    return (
      <section className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-6">
        <h2 className="text-xl font-bold text-yellow-100">
          Account sync is unavailable
        </h2>

        <p className="mt-3 text-sm leading-6 text-yellow-50/80">
          {configStatus.message}
        </p>

        <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-black/20 p-4 text-sm text-yellow-50/80">
          <p className="font-semibold text-yellow-100">
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
      className="rounded-2xl border border-white/10 bg-black/28 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div>
        <label
          htmlFor="email"
          className="text-sm font-semibold text-gray-200"
        >
          Email
        </label>

        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-emerald-400"
          placeholder="you@example.com"
        />
      </div>

      <div className="mt-4">
        <label
          htmlFor="password"
          className="text-sm font-semibold text-gray-200"
        >
          Password
        </label>

        <input
          id="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-emerald-400"
          placeholder="Enter your password"
        />
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm leading-6 text-red-100">
          {error}
        </p>
      )}

      {message && (
        <p className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm leading-6 text-green-100">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-5 w-full rounded-xl bg-emerald-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-900 disabled:text-gray-300"
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
