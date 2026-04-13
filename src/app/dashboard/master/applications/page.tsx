import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMaster } from "@/lib/roles";

export const dynamic = "force-dynamic";

type SearchProps = { searchParams: Promise<{ page?: string }> };

export default async function MasterApplicationsPage(props: SearchProps) {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const sp = await props.searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 25;
  const skip = Math.max(0, (page - 1) * pageSize);

  const [total, applications] = await Promise.all([
    prisma.application.count(),
    prisma.application.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        status: true,
        admissionReview: true,
        paymentStatus: true,
        createdAt: true,
        user: { select: { name: true, email: true, phone: true } },
        university: { select: { name: true, code: true } },
        lead: {
          select: {
            stream: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/dashboard" className="text-sm font-medium text-[var(--primary)] underline underline-offset-2">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">All applications</h1>
      <p className="mt-1 text-sm text-[var(--foreground-muted)]">
        Cross-university view ({total} total).
      </p>

      <div className="mt-8 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
            <tr>
              <th className="px-3 py-2">Application ID</th>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2">University</th>
              <th className="px-3 py-2">Course</th>
              <th className="px-3 py-2">Pipeline</th>
              <th className="px-3 py-2">Review</th>
              <th className="px-3 py-2">Payment</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((a) => (
              <tr key={a.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{a.id}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{a.user.name ?? "—"}</div>
                  <div className="text-xs text-[var(--foreground-muted)]">{a.user.email}</div>
                </td>
                <td className="px-3 py-2">{a.university?.name ?? "—"}</td>
                <td className="px-3 py-2">{a.lead?.stream.name ?? "—"}</td>
                <td className="px-3 py-2">{a.status}</td>
                <td className="px-3 py-2">{a.admissionReview}</td>
                <td className="px-3 py-2">{a.paymentStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <p className="text-[var(--foreground-muted)]">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-3">
          {page > 1 ? (
            <Link
              className="underline"
              href={`/dashboard/master/applications?page=${page - 1}`}
            >
              Previous
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              className="underline"
              href={`/dashboard/master/applications?page=${page + 1}`}
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
