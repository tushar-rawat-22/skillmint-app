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
    <section className="mx-auto max-w-4xl px-6 pb-24">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-700 bg-neutral-900 p-24 text-center transition hover:border-green-500">
        <div className="text-7xl">
          📄
        </div>

        <h2 className="mt-8 text-3xl font-bold">
          Upload Resume
        </h2>

        <p className="mt-4 text-gray-400">
          PDF, DOCX, or TXT - Max 5MB
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
