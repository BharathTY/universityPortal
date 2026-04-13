/**
 * When true, POST /api/auth/request-otp may include `otp` in the JSON body
 * so the login UI can show it (dev default, or explicit opt-in for demos).
 * Set SHOW_OTP_ON_SCREEN=false to disable in development.
 */
export function shouldRevealOtpInApiResponse(): boolean {
  if (process.env.SHOW_OTP_ON_SCREEN === "true") return true;
  if (process.env.SHOW_OTP_ON_SCREEN === "false") return false;
  return process.env.NODE_ENV === "development";
}
