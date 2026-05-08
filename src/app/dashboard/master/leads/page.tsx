import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMaster } from "@/lib/roles";

export const dynamic = "force-dynamic";

function reviewLabel(s: string) {
  switch (s) {
    case "PENDING":
      return "Pending";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    default:
      return s;
  }
}

function paymentLabel(s: string) {
  return s.replace(/_/g, " ");
}

export default async function MasterPartnerLeadsPage() {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const leads = await prisma.admissionLead.findMany({
    where: { createdByUserId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      university: { select: { name: true, code: true } },
      academicYear: { select: { label: true } },
      stream: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
      application: {
        select: { admissionReview: true, paymentStatus: true },
      },
    },
  });

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/master/universities"
        className="text-sm font-medium text-[var(--primary)] underline underline-offset-2"
      >
        ← Universities
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)] sm:text-3xl">Partner leads</h1>
      <p className="mt-2 text-[var(--foreground-muted)]">
        Leads submitted by consultants across all universities. Review and payment reflect the linked application when
        the lead has been converted.
      </p>

      <div className="mt-8 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
            <tr>
              <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Student</th>
              <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Consultant</th>
              <th className="px-3 py-3 font-semibold text-[var(--foreground)]">University</th>
              <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Degree</th>
              <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Stream / intake</th>
              <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Review</th>
              <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Payment</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => {
              const consultant = l.createdBy;
              const app = l.application;
              return (
                <tr key={l.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3 py-3">
                    <div className="font-medium text-[var(--foreground)]">
                      {l.firstName} {l.lastName}
                    </div>
                    <div className="text-xs text-[var(--foreground-muted)]">{l.email}</div>
                  </td>
                  <td className="px-3 py-3">
                    {consultant ? (
                      <>
                        <div className="text-[var(--foreground)]">{consultant.name ?? "—"}</div>
                        <div className="text-xs text-[var(--foreground-muted)]">{consultant.email}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {l.university.name}{" "}
                    <span className="text-xs text-[var(--foreground-muted)]">({l.university.code})</span>
                  </td>
                  <td className="px-3 py-3 text-[var(--foreground-muted)]">{l.stream.name}</td>
                  <td className="px-3 py-3 text-[var(--foreground-muted)]">{l.academicYear.label}</td>
                  <td className="px-3 py-3">
                    {app ? reviewLabel(app.admissionReview) : <span className="text-[var(--foreground-muted)]">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    {app ? (
                      <span className="text-[var(--foreground)]">{paymentLabel(app.paymentStatus)}</span>
                    ) : (
                      <span className="text-[var(--foreground-muted)]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {leads.length === 0 ? (
        <p className="mt-8 text-center text-sm text-[var(--foreground-muted)]">No consultant leads yet.</p>
      ) : null}
    </div>
  );
}
