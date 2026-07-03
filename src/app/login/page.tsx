import Link from "next/link";

import AuthForm from "@/modules/auth/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <section className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
        <Link
          href="/"
          className="text-2xl font-black text-green-500"
        >
          SkillMint
        </Link>

        <div className="mt-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-400">
            Login
          </p>

          <h1 className="mt-4 text-4xl font-black">
            Welcome back
          </h1>

          <p className="mt-4 text-sm leading-6 text-gray-400">
            Continue building your career operating system.
          </p>
        </div>

        <div className="mt-8">
          <AuthForm mode="login" />
        </div>

        <p className="mt-6 text-sm text-gray-400">
          New to SkillMint?{" "}
          <Link
            href="/signup"
            className="font-semibold text-green-300 transition hover:text-green-200"
          >
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
