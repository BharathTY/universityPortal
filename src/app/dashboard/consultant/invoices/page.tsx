import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { ListQueryToolbar, SORT_LATEST } from "@/components/list-controls";
import { requireAuth } from "@/lib/auth";
import {
  paginationMeta,
  parsePage,
  parsePageSize,
  paymentTextSearchWhere,
  searchParamOne,
} from "@/lib/list-query";
import { prisma } from "@/lib/prisma";
import { isConsultantOnly } from "@/lib/roles";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function formatInr(value: unknown): string {
  const n = value != null ? Number(String(value)) : NaN;
  if (!Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(iso);
}

export default async function ConsultantInvoicesPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  if (!isConsultantOnly(session.roles)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const statusParam = searchParamOne(sp, "status");
  const q = searchParamOne(sp, "q");
  const sort = searchParamOne(sp, "sort") ?? "latest";
  const page = parsePage(searchParamOne(sp, "page"));
  const pageSize = parsePageSize(searchParamOne(sp, "pageSize"), 25);

  const isCompleted = statusParam === "completed";
  const paymentStatus = isCompleted ? "SUCCESS" : "PENDING";

  const baseWhere: Prisma.LeadPaymentWhereInput = {
    status: paymentStatus,
    lead: { createdByUserId: session.sub },
  };
  const textWhere = paymentTextSearchWhere(q);
  const where: Prisma.LeadPaymentWhereInput = textWhere ? { AND: [baseWhere, textWhere] } : baseWhere;

  const orderBy: Prisma.LeadPaymentOrderByWithRelationInput =
    sort === "oldest" ? { createdAt: "asc" } : { createdAt: "desc" };

  const [total, payments] = await Promise.all([
    prisma.leadPayment.count({ where }),
    prisma.leadPayment.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        lead: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            university: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const { page: safePage, totalPages } = paginationMeta(total, page, pageSize);
  const title = isCompleted ? "Completed payments" : "Pending payments";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">{title}</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        Lead registration payments collected through your account.
      </p>

      <div className="mt-6 flex gap-2">
        <Link
          href="/dashboard/consultant/invoices?status=pending"
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            !isCompleted
              ? "bg-[var(--primary)] text-white"
              : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
          }`}
        >
          Pending
        </Link>
        <Link
          href="/dashboard/consultant/invoices?status=completed"
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            isCompleted
              ? "bg-[var(--primary)] text-white"
              : "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
          }`}
        >
          Completed
        </Link>
      </div>

      <ListQueryToolbar
        className="mt-6"
        total={total}
        page={safePage}
        pageSize={pageSize}
        totalPages={totalPages}
        q={q ?? ""}
        sort={sort}
        sortOptions={SORT_LATEST}
        searchPlaceholder="Lead name, email, university, or reference"
        itemLabel="payment"
      />

      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40 text-[var(--foreground-muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Lead</th>
              <th className="px-4 py-3 font-semibold">University</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Method</th>
              <th className="px-4 py-3 font-semibold">Reference</th>
              <th className="px-4 py-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--foreground-muted)]">
                  No {isCompleted ? "completed" : "pending"} payments match your search.
                </td>
              </tr>
            ) : (
              payments.map((p) => {
                const leadName = `${p.lead.firstName} ${p.lead.lastName}`.trim() || p.lead.email;
                return (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--foreground)]">{leadName}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">{p.lead.email}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">{p.lead.university.name}</td>
                    <td className="px-4 py-3 tabular-nums text-[var(--foreground)]">{formatInr(p.amount)}</td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">{p.paymentMethod ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--foreground-muted)]">{p.transactionRef}</td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">{formatDate(p.createdAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
