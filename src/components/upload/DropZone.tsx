"use client";

type Props = {
  file: File | null;
  setFile: (file: File | null) => void;
};

export default function DropZone({
  file,
  setFile,
}: Props) {
  if (file) return null;

  return (
    <section className="mx-auto max-w-4xl px-6 pb-20 pt-8">
      <label className="group flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-emerald-300 bg-white p-10 text-center shadow-[0_16px_48px_rgba(15,23,42,0.07)] transition hover:border-emerald-500 hover:bg-emerald-50 md:p-16">
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-3xl text-emerald-800 transition group-hover:scale-[1.02]">
          ↑
        </div>

        <h2 className="mt-8 text-3xl font-black text-slate-950">
          Drop your resume here
        </h2>

        <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
          Choose a PDF, DOCX, or TXT file up to 5MB. Full extracted text is
          used for analysis, but raw text stays hidden by default.
        </p>

        <input
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0];

            if (!selectedFile) return;

            setFile(selectedFile);
            event.currentTarget.value = "";
          }}
        />
      </label>
    </section>
  );
}
