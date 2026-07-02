"use client";

import { useState } from "react";

import UploadHero from "@/components/upload/UploadHero";
import DropZone from "@/components/upload/DropZone";
import FileCard from "@/components/upload/FileCard";
import AnalysisProgress from "@/components/upload/AnalysisProgress";

export default function UploadPage() {

  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  function analyzeResume() {

    if (!file) return;

    setLoading(true);

    setTimeout(() => {

      setLoading(false);

      alert("Resume analysis will be connected in the next drop.");

    }, 2500);

  }

  return (

    <main className="min-h-screen bg-black pb-24 text-white">

      <UploadHero />

      <DropZone
        file={file}
        setFile={setFile}
      />

      {file && (

        <>
          <FileCard
            file={file}
            remove={() => setFile(null)}
          />

          <div className="mt-8 text-center">

            <button
              onClick={analyzeResume}
              className="rounded-xl bg-green-600 px-10 py-4 font-semibold"
            >
              Analyze Resume
            </button>

          </div>

        </>

      )}

      <AnalysisProgress loading={loading} />

    </main>

  );

}