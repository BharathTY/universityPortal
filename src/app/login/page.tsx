import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { LoginForm } from "./login-form";
import { PORTAL_BRAND_NAME } from "@/components/portal-logo";

type Props = {
  searchParams: Promise<{ email?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const requireOtpLogin = process.env.REQUIRE_OTP_LOGIN === "true";
  const sp = await searchParams;
  const initialEmail = sp.email?.trim() ?? "";

  return (
    <AuthPageShell
      title={`Sign in to ${PORTAL_BRAND_NAME}`}
      subtitle={
        requireOtpLogin
          ? "Enter your work email. We'll send you a secure one-time code to continue."
          : "Enter your email and password if your account has one, or email only for passwordless access."
      }
    >
      <LoginForm requireOtpLogin={requireOtpLogin} initialEmail={initialEmail} />
    </AuthPageShell>
  );
}
