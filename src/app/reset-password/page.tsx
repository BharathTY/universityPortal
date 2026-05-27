import { Merriweather } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ResetPasswordForm } from "./reset-password-form";

const signInSerif = Merriweather({
  weight: ["400", "700"],
  subsets: ["latin"],
});

export default function ResetPasswordPage() {
  return (
    <AuthPageShell
      formColumnClassName={signInSerif.className}
      title="Choose a new password"
      subtitle="Enter a new password for your account. The link expires after one hour."
      navSlot={
        <Link href="/login" className="auth-link text-sm">
          ← Back to sign in
        </Link>
      }
    >
      <Suspense fallback={<p className="mt-10 text-sm text-slate-500">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthPageShell>
  );
}
