import Link from "next/link";

import AuthForm from "@/modules/auth/components/AuthForm";
import AuthPageShell from "@/modules/auth/components/AuthPageShell";

export default function LoginPage() {
  return (
    <AuthPageShell
      eyebrow="Login"
      title="Welcome back"
      subtitle="Continue your career loop."
    >
      <AuthForm mode="login" />

      <div className="mt-6 flex flex-col gap-3 text-sm text-gray-400 sm:flex-row sm:items-center sm:justify-between">
        <p>
          New to SkillMint?{" "}
          <Link
            href="/signup"
            className="font-semibold text-green-300 transition hover:text-green-200"
          >
            Create an account
          </Link>
        </p>

        <Link
          href="/forgot-password"
          className="font-semibold text-green-300 transition hover:text-green-200"
        >
          Forgot password?
        </Link>
      </div>
    </AuthPageShell>
  );
}
