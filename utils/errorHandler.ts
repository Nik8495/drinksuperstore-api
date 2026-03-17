/**
 * Returns a safe error message for API responses.
 * In production, internal error details are hidden from clients.
 */
export const safeError = (error: any, fallback = 'An unexpected error occurred') => {
  if (process.env['NODE_ENV'] === 'production') {
    return fallback;
  }
  return error?.message || fallback;
};
