import { AuthFooterLink, AuthPageShell } from "@/components/auth/AuthPageShell";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthPageShell
      title="Welcome back"
      subtitle="Enter your email to sign in."
    >
      <LoginForm />
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
