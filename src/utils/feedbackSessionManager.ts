// Manages feedback session flags to control when exit-intent feedback appears

const SESSION_STORAGE_KEYS = {
  FEEDBACK_SUBMITTED: 'cravlr_feedback_submitted',
  EXIT_FEEDBACK_SHOWN: 'cravlr_exit_feedback_shown',
  CURRENT_REQUEST_ID: 'cravlr_current_request_id'
} as const;

export const feedbackSessionManager = {
  // Mark that feedback has been submitted
  markFeedbackSubmitted: () => {
    sessionStorage.setItem(SESSION_STORAGE_KEYS.FEEDBACK_SUBMITTED, 'true');
  },

  // Mark that exit-intent feedback has been shown
  markExitFeedbackShown: () => {
    sessionStorage.setItem(SESSION_STORAGE_KEYS.EXIT_FEEDBACK_SHOWN, 'true');
  },

  // Check if feedback was submitted this session
  hasFeedbackSubmitted: (): boolean => {
    return sessionStorage.getItem(SESSION_STORAGE_KEYS.FEEDBACK_SUBMITTED) === 'true';
  },

  // Check if exit-intent feedback was shown this session
  hasExitFeedbackShown: (): boolean => {
    return sessionStorage.getItem(SESSION_STORAGE_KEYS.EXIT_FEEDBACK_SHOWN) === 'true';
  },

  // Reset all feedback flags (call when a new request flow starts)
  resetFeedbackFlags: () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.FEEDBACK_SUBMITTED);
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.EXIT_FEEDBACK_SHOWN);
  },

  // Track and reset flags when viewing a new request
  trackRequestView: (requestId: string) => {
    const currentRequestId = sessionStorage.getItem(SESSION_STORAGE_KEYS.CURRENT_REQUEST_ID);
    
    // If this is a different request, reset feedback flags
    if (currentRequestId !== requestId) {
      feedbackSessionManager.resetFeedbackFlags();
      sessionStorage.setItem(SESSION_STORAGE_KEYS.CURRENT_REQUEST_ID, requestId);
    }
  },

  // Reset on new request creation
  onNewRequestCreated: () => {
    feedbackSessionManager.resetFeedbackFlags();
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.CURRENT_REQUEST_ID);
  }
};
