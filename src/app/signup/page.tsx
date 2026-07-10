import Link from "next/link";

import AuthForm from "@/modules/auth/components/AuthForm";
import AuthPageShell from "@/modules/auth/components/AuthPageShell";

export default function SignupPage() {
  return (
    <AuthPageShell
      eyebrow="Signup"
      title="Create your SkillMint account"
      subtitle="Start free. Save your career direction, resume proof, job matches, and roadmap."
    >
      <AuthForm mode="signup" />

      <p className="mt-6 text-sm text-slate-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-emerald-700 transition hover:text-emerald-900"
        >
          Log in
        </Link>
      </p>
    </AuthPageShell>
  );
}
