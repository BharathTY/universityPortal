import { Merriweather } from "next/font/google";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { LoginForm } from "./login-form";

const signInSerif = Merriweather({
  weight: ["400", "700"],
  subsets: ["latin"],
});

export default function LoginPage() {
  const requireOtpLogin = process.env.REQUIRE_OTP_LOGIN === "true";

  return (
    <AuthPageShell
      formColumnClassName={signInSerif.className}
      title="Sign in to Eduversity"
      subtitle={
        requireOtpLogin
          ? "Enter your work email. We’ll send you a secure one-time code to continue."
          : "Enter your email and password if your account has one, or email only for passwordless access."
      }
    >
      <LoginForm requireOtpLogin={requireOtpLogin} />
    </AuthPageShell>
  );
}
