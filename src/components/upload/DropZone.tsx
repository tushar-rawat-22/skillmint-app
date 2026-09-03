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
    <section className="mx-auto max-w-5xl px-6 pb-20">
      <label
        htmlFor="resume-file-upload"
        className="group relative flex cursor-pointer flex-col items-start justify-center border-2 border-dashed border-emerald-400 bg-white p-7 text-left transition hover:border-emerald-600 hover:bg-emerald-50 focus-within:border-emerald-700 focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-emerald-700 sm:p-10"
      >
        <p className="text-sm font-semibold text-emerald-800">Private by default</p>
        <h2 className="mt-3 text-3xl font-black text-slate-950">
          Choose your resume file
        </h2>

        <p id="resume-file-help" className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          PDF, DOCX, or TXT up to 4 MiB. SkillMint uses the extracted text for
          your private analysis; raw text stays hidden by default.
        </p>

        <span className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-emerald-800 px-5 py-3 text-sm font-bold text-white transition group-hover:bg-emerald-900">
          Browse files
        </span>

        <input
          id="resume-file-upload"
          type="file"
          accept=".pdf,.docx,.txt"
          aria-describedby="resume-file-help"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
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