"use client";

import { useResumeUpload } from "@/hooks/useResumeUpload";

export default function DropZone() {
  const { resume, upload, remove } = useResumeUpload();

  return (
    <section className="mx-auto max-w-4xl px-6 pb-24">

      {!resume && (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-700 bg-neutral-900 p-24 transition hover:border-green-500">

          <div className="text-7xl">
            📄
          </div>

          <h2 className="mt-8 text-3xl font-bold">
            Upload Resume
          </h2>

          <p className="mt-4 text-gray-400">
            PDF • DOCX • Max 5MB
          </p>

          <input
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              if (!e.target.files?.length) return;
              upload(e.target.files[0]);
            }}
          />
        </label>
      )}

      {resume && (
        <div className="rounded-3xl border border-green-600 bg-neutral-900 p-10">

          <h2 className="text-2xl font-bold">
            Resume Uploaded
          </h2>

          <div className="mt-6 space-y-2">

            <p>
              <strong>Name:</strong> {resume.name}
            </p>

            <p>
              <strong>Size:</strong> {resume.size}
            </p>

          </div>

          <div className="mt-8 flex gap-4">

            <button
              className="rounded-xl bg-green-600 px-6 py-3"
            >
              Analyze Resume
            </button>

            <button
              onClick={remove}
              className="rounded-xl border border-gray-600 px-6 py-3"
            >
              Remove
            </button>

          </div>

        </div>
      )}

    </section>
  );
}