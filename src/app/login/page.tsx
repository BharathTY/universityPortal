import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const requireOtpLogin = process.env.REQUIRE_OTP_LOGIN === "true";

  return (
    <AuthPageShell
      title="Sign in to Eduversity"
      subtitle={
        requireOtpLogin
          ? "Enter your work email. We'll send you a secure one-time code to continue."
          : "Enter your email and password if your account has one, or email only for passwordless access."
      }
    >
      <LoginForm requireOtpLogin={requireOtpLogin} />
    </AuthPageShell>
  );
}
