import type {
  AnalyticsDurationBucket,
  AnalyticsFileType,
  AnalyticsResumeErrorCode,
  AnalyticsSourceScreen,
} from "./eventContract";

export function getAnalyticsDurationBucket(
  startedAtMs: number,
  finishedAtMs: number,
): AnalyticsDurationBucket {
  const duration = Math.max(0, finishedAtMs - startedAtMs);
  if (duration < 1_000) return "under_1s";
  if (duration < 5_000) return "1s_to_5s";
  if (duration < 15_000) return "5s_to_15s";
  if (duration < 60_000) return "15s_to_60s";
  return "over_60s";
}

export function getAnalyticsFileType(file: Pick<File, "name" | "type">): AnalyticsFileType {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf" || file.type === "application/pdf") return "pdf";
  if (
    extension === "docx" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) return "docx";
  if (extension === "txt" || file.type === "text/plain") return "txt";
  return "unknown";
}

export function getResumeAnalyticsErrorCode(
  error: unknown,
): AnalyticsResumeErrorCode {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("file type") || message.includes("pdf, docx")) {
    return "invalid_file_type";
  }
  if (message.includes("5mb") || message.includes("too large")) {
    return "file_too_large";
  }
  if (message.includes("extract") || message.includes("pdf") || message.includes("docx")) {
    return "text_extraction_failed";
  }
  if (message.includes("empty") || message.includes("no readable")) {
    return "empty_resume";
  }
  if (message.includes("browser storage") || message.includes("save this analysis")) {
    return "storage_failed";
  }
  return error instanceof Error ? "analysis_failed" : "unknown";
}

export function getAnalyticsSourceScreen(pathname: string | null): AnalyticsSourceScreen {
  switch (pathname) {
    case "/": return "home";
    case "/login": return "login";
    case "/signup": return "signup";
    case "/forgot-password": return "forgot_password";
    case "/reset-password": return "reset_password";
    case "/setup": return "career_setup";
    case "/upload": return "resume_upload";
    case "/resume": return "resume_report";
    case "/dashboard": return "dashboard";
    case "/ats": return "jd_match";
    case "/roadmap": return "roadmap";
    case "/profile": return "profile";
    case "/settings": return "settings";
    case "/settings/data": return "data_controls";
    case "/privacy": return "privacy";
    default: return "home";
  }
}
