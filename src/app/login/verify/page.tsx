import Link from "next/link";
import { Suspense } from "react";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { VerifyForm } from "./verify-form";

type PageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function LoginVerifyPage(props: PageProps) {
  const sp = await props.searchParams;
  const email = sp.email?.trim();
  const subtitle = email
    ? `Enter the 6-digit code sent to ${email}.`
    : "Enter the 6-digit code we sent to your email.";

  return (
    <AuthPageShell
      title="Check your email"
      subtitle={subtitle}
      navSlot={
        <Link href="/login" className="text-sm font-medium text-[#1e6fe6] hover:underline">
          ← Back to login
        </Link>
      }
    >
      <Suspense fallback={<p className="mt-8 text-sm text-slate-500">Loading…</p>}>
        <VerifyForm />
      </Suspense>
    </AuthPageShell>
  );
}
