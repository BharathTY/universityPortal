import { Merriweather } from "next/font/google";
import Link from "next/link";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ForgotPasswordForm } from "./forgot-password-form";

const signInSerif = Merriweather({
  weight: ["400", "700"],
  subsets: ["latin"],
});

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      formColumnClassName={signInSerif.className}
      title="Forgot your password?"
      subtitle="Enter the email for your account. We'll send a link to reset your password if the account uses password sign-in."
      navSlot={
        <Link href="/login" className="auth-link text-sm">
          ← Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
