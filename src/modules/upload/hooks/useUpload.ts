"use client";

import { useState } from "react";

import type { UploadState } from "../types/upload";

export function useUpload() {

    const [state,setState]=useState<UploadState>({

        uploading:false,

        progress:0,

        complete:false

    });

    return{

        state,

        setState

    };

}