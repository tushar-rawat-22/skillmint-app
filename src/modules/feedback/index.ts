export { default as FeedbackWidget } from "./components/FeedbackWidget";
export { submitBetaFeedback } from "./services/feedbackRepository";
export {
  getLocalFeedbackItems,
  saveFeedbackLocally,
} from "./services/feedbackLocalStorage";
export type {
  FeedbackSentiment,
  FeedbackType,
  LocalBetaFeedback,
  PersistedBetaFeedback,
  RepositoryResult,
  SubmitFeedbackInput,
} from "./types";
