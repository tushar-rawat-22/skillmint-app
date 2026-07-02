export default function Footer() {
  return (
    <footer className="border-t border-gray-200 py-8">
      <div className="mx-auto max-w-7xl px-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} SkillMint.
        Built to help every student build a better career.
      </div>
    </footer>
  );
}