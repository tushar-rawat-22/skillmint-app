"use client";

import { useState } from "react";

export interface UploadedResume {
  file: File;
  name: string;
  size: string;
}

export function useResumeUpload() {
  const [resume, setResume] =
    useState<UploadedResume | null>(null);

  function upload(file: File) {
    const size =
      (file.size / 1024 / 1024).toFixed(2) + " MB";

    setResume({
      file,
      name: file.name,
      size,
    });
  }

  function remove() {
    setResume(null);
  }

  return {
    resume,
    upload,
    remove,
  };
}