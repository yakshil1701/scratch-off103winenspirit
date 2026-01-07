/**
 * Secure error handling utility
 * Prevents leaking sensitive database/system information to browser console
 */

export const sanitizeError = (error: unknown): string => {
  if (error instanceof Error) {
    return 'An error occurred. Please try again.';
  }
  return 'An unexpected error occurred.';
};

export const logErrorSecurely = (context: string) => {
  // Only log generic context info to console - no error details
  console.error(`Error in ${context}`);
};
