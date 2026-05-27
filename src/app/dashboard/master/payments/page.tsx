import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { ListQueryToolbar, SORT_LATEST } from "@/components/list-controls";
import { PaymentReceiptLink } from "@/components/payment-receipt-link";
import { requireAuth } from "@/lib/auth";
import {
  paginationMeta,
  parsePage,
  parsePageSize,
  paymentTextSearchWhere,
  searchParamOne,
} from "@/lib/list-query";
import { prisma } from "@/lib/prisma";
import { isMaster } from "@/lib/roles";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatInr(value: unknown): string {
  const n = value != null ? Number(String(value)) : NaN;
  if (!Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatDate(iso: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(iso);
}

export default async function MasterPaymentsPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const q = searchParamOne(sp, "q");
  const sort = searchParamOne(sp, "sort") ?? "latest";
  const page = parsePage(searchParamOne(sp, "page"));
  const pageSize = parsePageSize(searchParamOne(sp, "pageSize"), 25);

  const baseWhere: Prisma.LeadPaymentWhereInput = { status: "SUCCESS" };
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

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Master Admin</p>
      <h1 className="mt-1 font-serif text-3xl font-bold text-[var(--foreground)]">Payments</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        All completed transactions across consultants and universities.
      </p>

      <ListQueryToolbar
        className="mt-8"
        total={total}
        page={safePage}
        pageSize={pageSize}
        totalPages={totalPages}
        q={q ?? ""}
        sort={sort}
        sortOptions={SORT_LATEST}
        searchPlaceholder="Txn ID, student name, email, or university"
        itemLabel="payment"
      />

      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
            <tr>
              <th className="px-4 py-3 font-semibold text-[var(--foreground)]">Txn ID</th>
              <th className="px-4 py-3 font-semibold text-[var(--foreground)]">Student</th>
              <th className="px-4 py-3 font-semibold text-[var(--foreground)]">University</th>
              <th className="px-4 py-3 font-semibold text-[var(--foreground)]">Date</th>
              <th className="px-4 py-3 font-semibold text-[var(--foreground)]">Amount</th>
              <th className="px-4 py-3 font-semibold text-[var(--foreground)]">Action</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[var(--foreground-muted)]">
                  {q ? "No payments match your search." : "No completed payments yet."}
                </td>
              </tr>
            ) : (
              payments.map((p) => {
                const studentName = `${p.lead.firstName} ${p.lead.lastName}`.trim() || p.lead.email;
                return (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--foreground-muted)]">
                      {p.transactionRef}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--foreground)]">{studentName}</p>
                      <p className="text-xs text-[var(--foreground-muted)]">{p.lead.email}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{p.lead.university.name}</td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3 tabular-nums font-medium text-[var(--foreground)]">
                      {formatInr(p.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <PaymentReceiptLink
                        transactionRef={p.transactionRef}
                        amount={String(p.amount)}
                        studentName={studentName}
                        universityName={p.lead.university.name}
                        createdAt={p.createdAt.toISOString()}
                      />
                    </td>
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
