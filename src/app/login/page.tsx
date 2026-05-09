import { AuthFooterLink, AuthPageShell } from "@/components/auth/AuthPageShell";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  const requireOtpLogin = process.env.REQUIRE_OTP_LOGIN === "true";

  return (
    <AuthPageShell
      title="Welcome back"
      subtitle={
        requireOtpLogin
          ? "Enter your email. We’ll send a one-time code."
          : "Enter your email to sign in."
      }
    >
      <LoginForm requireOtpLogin={requireOtpLogin} />
      <AuthFooterLink
        prompt="Don't have an account?"
        linkText="Sign up"
        href="#"
      />
      <p className="mt-6 text-center text-xs text-slate-400">
        Staff and counsellors use work email. Need help?{" "}
        <a href="#" className="font-medium text-[#1e6fe6] hover:underline">
          Contact IT
        </a>
      </p>
    </AuthPageShell>
  );
}
