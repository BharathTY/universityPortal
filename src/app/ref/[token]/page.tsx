import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BrochureReferralForm } from "@/app/ref/[token]/brochure-referral-form";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ token: string }> };

export default async function BrochureReferralPage(props: PageProps) {
  const { token } = await props.params;
  const batch = await prisma.batch.findFirst({
    where: { leadPunchToken: token },
    select: { title: true, code: true },
  });
  if (!batch) notFound();

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-lg">
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)]">
          Referral — brochure &amp; QR
        </p>
        <BrochureReferralForm token={token} batchTitle={batch.title} batchCode={batch.code} />
      </div>
    </div>
  );
}
