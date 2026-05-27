"use client";

import { ClientFilteredTable } from "@/components/list-controls";
import type { MasterSeatRow } from "@/lib/master-seats-data";

type Props = {
  rows: MasterSeatRow[];
  countColumn: string;
};

export function MasterSeatsTable({ rows, countColumn }: Props) {
  return (
    <ClientFilteredTable
      rows={rows}
      itemLabel="stream"
      searchPlaceholder="University, stream, or degree"
      filterKeys={(row, q) => {
        const hay = `${row.universityName} ${row.universityCode} ${row.streamName} ${row.degreeType ?? ""}`.toLowerCase();
        return hay.includes(q);
      }}
      renderTable={(visible) => (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
              <tr>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">University</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Stream</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Degree</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Total seats</th>
                <th className="px-3 py-3 font-semibold text-[var(--foreground)]">{countColumn}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-[var(--foreground-muted)]">
                    No streams match your search.
                  </td>
                </tr>
              ) : (
                visible.map((r) => (
                  <tr key={r.streamId} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-3">
                      <div className="font-medium text-[var(--foreground)]">{r.universityName}</div>
                      <div className="font-mono text-xs text-[var(--foreground-muted)]">{r.universityCode}</div>
                    </td>
                    <td className="px-3 py-3 text-[var(--foreground)]">{r.streamName}</td>
                    <td className="px-3 py-3 text-[var(--foreground-muted)]">{r.degreeType ?? "—"}</td>
                    <td className="px-3 py-3 tabular-nums">{r.totalSeats}</td>
                    <td className="px-3 py-3 tabular-nums font-semibold text-[var(--foreground)]">
                      {countColumn === "Available" ? r.availableSeats : r.filledSeats}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    />
  );
}
