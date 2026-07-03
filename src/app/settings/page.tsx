import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <section className="max-w-4xl">
        <h1 className="text-4xl font-black">
          Settings
        </h1>

        <p className="mt-4 max-w-2xl text-gray-400">
          Manage your SkillMint preferences and account setup.
        </p>

        <article className="mt-8 rounded-lg border border-gray-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-bold">
            Settings coming soon
          </h2>

          <p className="mt-3 text-sm leading-6 text-gray-400">
            Profile preferences, account setup, and workspace controls will
            live here.
          </p>
        </article>
      </section>
    </DashboardLayout>
  );
}
