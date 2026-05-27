import Link from "next/link";
import { redirect } from "next/navigation";
import { MasterSeatsTable } from "@/app/dashboard/master/seats/master-seats-table";
import { requireAuth } from "@/lib/auth";
import { listMasterSeatRows } from "@/lib/master-seats-data";
import { isMaster } from "@/lib/roles";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ type?: string }>;
};

export default async function MasterSeatsPage(props: PageProps) {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const sp = await props.searchParams;
  const typeRaw = sp.type?.trim().toLowerCase();
  const type = typeRaw === "filled" ? "filled" : "available";

  const { rows, totalSeats, totalFilled, totalAvailable } = await listMasterSeatRows(type);

  const title = type === "available" ? "Available seats" : "Filled seats";
  const countColumn = type === "available" ? "Available" : "Filled";

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/master"
        className="text-sm font-medium text-[var(--primary)] underline underline-offset-2"
      >
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)] sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        Stream-level seat breakdown across all universities. Platform totals:{" "}
        <strong className="text-[var(--foreground)]">{totalSeats}</strong> capacity,{" "}
        <strong className="text-[var(--foreground)]">{totalFilled}</strong> filled,{" "}
        <strong className="text-[var(--foreground)]">{totalAvailable}</strong> available.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/dashboard/master/seats?type=available"
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
            type === "available"
              ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]"
              : "border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--muted)]/40"
          }`}
        >
          Available
        </Link>
        <Link
          href="/dashboard/master/seats?type=filled"
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
            type === "filled"
              ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]"
              : "border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--muted)]/40"
          }`}
        >
          Filled
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-10 text-center text-sm text-[var(--foreground-muted)]">
          No streams with {type === "available" ? "available" : "filled"} seats to show.
        </p>
      ) : (
        <div className="mt-8">
          <MasterSeatsTable rows={rows} countColumn={countColumn} />
        </div>
      )}
    </div>
  );
}
