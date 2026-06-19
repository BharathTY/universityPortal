"use client";

import * as React from "react";
import {
  ConsultantDetailModal,
  ConsultantSpocDetailModal,
} from "@/components/consultant-detail-modal";
import { ConsultantRowActionsMenu } from "@/components/consultant-row-actions-menu";
import type { ConsultantSpocSummary } from "@/lib/consultant-spoc";

export type ConsultantListRow = {
  id: string;
  name: string | null;
  companyName: string | null;
  email: string;
  phone: string | null;
  accountStatus: "ACTIVE" | "INACTIVE";
  createdAtLabel: string;
  uniLabels: string[];
  spocs: ConsultantSpocSummary[];
};

type Props = {
  consultants: ConsultantListRow[];
};

export function ConsultantsListTable({ consultants }: Props) {
  const [detailConsultantId, setDetailConsultantId] = React.useState<string | null>(null);
  const [detailSpoc, setDetailSpoc] = React.useState<ConsultantSpocSummary | null>(null);

  return (
    <>
      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--muted)]/40">
            <tr>
              <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Consultant name</th>
              <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Company</th>
              <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Email</th>
              <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Phone</th>
              <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Assigned universities</th>
              <th className="px-3 py-3 font-semibold text-[var(--foreground)]">SPOC</th>
              <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Status</th>
              <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Created</th>
              <th className="px-3 py-3 font-semibold text-[var(--foreground)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {consultants.map((u) => {
              const primaryUni = u.uniLabels[0] ?? null;
              const extraUniCount = u.uniLabels.length > 1 ? u.uniLabels.length - 1 : 0;
              const primarySpoc = u.spocs[0] ?? null;
              const extraSpocCount = u.spocs.length > 1 ? u.spocs.length - 1 : 0;
              const spocLabels = u.spocs.map((s) => {
                const label = s.name?.trim() || s.email;
                return s.designation?.trim() ? `${label} (${s.designation})` : label;
              });

              return (
                <tr
                  key={u.id}
                  className={`border-b border-[var(--border)] last:border-0 ${
                    u.accountStatus === "INACTIVE" ? "bg-[var(--muted)]/30" : ""
                  }`}
                >
                  <td className="px-3 py-3 font-medium text-[var(--foreground)]">
                    <button
                      type="button"
                      onClick={() => setDetailConsultantId(u.id)}
                      className="text-left text-[var(--primary)] underline-offset-2 hover:underline"
                    >
                      {u.name ?? "—"}
                    </button>
                  </td>
                  <td
                    className="max-w-[10rem] truncate px-3 py-3 text-[var(--foreground-muted)]"
                    title={u.companyName ?? undefined}
                  >
                    {u.companyName?.trim() || "—"}
                  </td>
                  <td className="max-w-[12rem] truncate px-3 py-3" title={u.email}>
                    {u.email}
                  </td>
                  <td className="px-3 py-3 tabular-nums">{u.phone ?? "—"}</td>
                  <td className="max-w-[16rem] px-3 py-3 text-[var(--foreground-muted)]">
                    {primaryUni ? (
                      <span title={u.uniLabels.join("\n")}>
                        {primaryUni}
                        {extraUniCount > 0 ? (
                          <span className="ml-1 rounded bg-[var(--muted)] px-1.5 py-0.5 text-xs font-medium text-[var(--foreground)]">
                            +{extraUniCount}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-[14rem] px-3 py-3 text-[var(--foreground-muted)]">
                    {primarySpoc ? (
                      <span title={spocLabels.join("\n")}>
                        <button
                          type="button"
                          onClick={() => setDetailSpoc(primarySpoc)}
                          className="text-left text-[var(--primary)] underline-offset-2 hover:underline"
                        >
                          {primarySpoc.name?.trim() || primarySpoc.email}
                        </button>
                        {primarySpoc.designation?.trim() ? (
                          <span className="block text-xs text-[var(--foreground-muted)]">
                            {primarySpoc.designation}
                          </span>
                        ) : null}
                        {extraSpocCount > 0 ? (
                          <span className="ml-1 rounded bg-[var(--muted)] px-1.5 py-0.5 text-xs font-medium text-[var(--foreground)]">
                            +{extraSpocCount}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.accountStatus === "ACTIVE"
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                          : "bg-[var(--muted)] text-[var(--foreground-muted)]"
                      }`}
                    >
                      {u.accountStatus === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-3 tabular-nums text-[var(--foreground-muted)]">
                    {u.createdAtLabel}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <ConsultantRowActionsMenu
                      userId={u.id}
                      name={u.name}
                      email={u.email}
                      accountStatus={u.accountStatus}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detailConsultantId ? (
        <ConsultantDetailModal
          consultantId={detailConsultantId}
          onClose={() => setDetailConsultantId(null)}
        />
      ) : null}
      {detailSpoc ? (
        <ConsultantSpocDetailModal spoc={detailSpoc} onClose={() => setDetailSpoc(null)} />
      ) : null}
    </>
  );
}
