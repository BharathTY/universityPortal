/**
 * When true, POST /api/auth/request-otp may include `otp` in the JSON body (dev or SHOW_OTP_ON_SCREEN).
 */
export function shouldRevealOtpInApiResponse(): boolean {
  if (process.env.SHOW_OTP_ON_SCREEN === "true") return true;
  if (process.env.SHOW_OTP_ON_SCREEN === "false") return false;
  return process.env.NODE_ENV === "development";
}
