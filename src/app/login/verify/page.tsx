import { Suspense } from "react";
import Link from "next/link";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { VerifyForm } from "./verify-form";

export default function VerifyPage() {
  return (
    <AuthPageShell
      navSlot={
        <Link href="/login" className="text-sm font-medium text-[#1e6fe6] hover:underline">
          ← Back to email
        </Link>
      }
      title="Enter verification code"
      subtitle="We sent a 6-digit code to your email. Enter it below to finish signing in."
    >
      <Suspense fallback={<p className="mt-8 text-sm text-slate-500">Loading…</p>}>
        <VerifyForm />
      </Suspense>
    </AuthPageShell>
  );
}
