import { Merriweather } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ActivateAccountForm } from "./activate-account-form";

const signInSerif = Merriweather({
  weight: ["400", "700"],
  subsets: ["latin"],
});

export default function ActivateAccountPage() {
  return (
    <AuthPageShell
      formColumnClassName={signInSerif.className}
      title="Set up your password"
      subtitle="Activate your QSpiders Eduversity account. Choose a password to sign in with your registered email."
      navSlot={
        <Link href="/login" className="auth-link text-sm">
          ← Back to sign in
        </Link>
      }
    >
      <Suspense fallback={<p className="mt-10 text-sm text-slate-500">Loading…</p>}>
        <ActivateAccountForm />
      </Suspense>
    </AuthPageShell>
  );
}
