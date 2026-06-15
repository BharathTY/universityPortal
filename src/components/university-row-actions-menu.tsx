"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ConfirmModal } from "@/components/confirm-modal";

type UniversityStatus = "ACTIVE" | "INACTIVE";

type SpocRow = {
  name: string;
  designation: string;
  mobile: string;
  email: string;
};

type Props = {
  universityId: string;
  name: string;
  status: UniversityStatus;
};

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7.5 12 13l8-5.5M5 18h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2Z"
      />
    </svg>
  );
}

export function UniversityEmailIconLink({ email }: { email: string | null }) {
  if (!email) {
    return <span className="text-[var(--foreground-muted)]">—</span>;
  }

  return (
    <a
      href={`mailto:${email}`}
      title={email}
      aria-label={`Email ${email}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--primary)] hover:bg-[var(--muted)]/60"
    >
      <EmailIcon className="h-4 w-4" />
    </a>
  );
}

export function UniversityRowActionsMenu({ universityId, name, status }: Props) {
  const router = useRouter();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [confirmMode, setConfirmMode] = React.useState<"deactivate" | "activate" | null>(null);
  const [spocOpen, setSpocOpen] = React.useState(false);
  const [spocBusy, setSpocBusy] = React.useState(false);
  const [spocError, setSpocError] = React.useState<string | null>(null);
  const [spocs, setSpocs] = React.useState<SpocRow[]>([]);

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  async function loadSpocs() {
    setSpocOpen(true);
    setSpocError(null);
    setSpocBusy(true);
    try {
      const res = await fetch(`/api/master/universities/${universityId}/overview`);
      const json = (await res.json().catch(() => ({}))) as { spocs?: SpocRow[]; error?: string };
      if (!res.ok) {
        setSpocError(json.error ?? "Could not load SPOC details");
        setSpocs([]);
        return;
      }
      setSpocs(json.spocs ?? []);
    } finally {
      setSpocBusy(false);
    }
  }

  async function setUniversityStatus(next: UniversityStatus) {
    setBusy(true);
    try {
      const res = await fetch(`/api/master/universities/${universityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error ?? "Could not update status");
        return;
      }
      setConfirmMode(null);
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function onMenuAction(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <>
      <div
        ref={rootRef}
        className="relative inline-block text-left"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Actions for ${name}`}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--foreground-muted)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]"
        >
          <span className="text-lg leading-none" aria-hidden>
            ⋮
          </span>
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 min-w-[12rem] rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--muted)]/50"
              onClick={() => onMenuAction(() => void loadSpocs())}
            >
              View SPOC details
            </button>
            <Link
              href={`/dashboard/master/universities/${universityId}/edit`}
              role="menuitem"
              className="block px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)]/50"
              onClick={() => setOpen(false)}
            >
              Edit university details
            </Link>
            <button
              type="button"
              role="menuitem"
              disabled={busy}
              className="block w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--muted)]/50 disabled:opacity-50"
              onClick={() =>
                onMenuAction(() => setConfirmMode(status === "ACTIVE" ? "deactivate" : "activate"))
              }
            >
              {status === "ACTIVE" ? "Set inactive" : "Set active"}
            </button>
            <Link
              href={`/dashboard/university/${universityId}/admissions`}
              role="menuitem"
              className="block px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)]/50"
              onClick={() => setOpen(false)}
            >
              Admissions
            </Link>
          </div>
        ) : null}
      </div>

      {spocOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="presentation">
          <button type="button" className="absolute inset-0 bg-black/45" aria-label="Dismiss" onClick={() => setSpocOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-[121] flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
          >
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">SPOC details</h2>
              <p className="mt-0.5 text-sm text-[var(--foreground-muted)]">{name}</p>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {spocBusy ? (
                <p className="text-sm text-[var(--foreground-muted)]">Loading…</p>
              ) : spocError ? (
                <p className="text-sm text-red-600">{spocError}</p>
              ) : spocs.length === 0 ? (
                <p className="text-sm text-[var(--foreground-muted)]">No SPOC records.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="py-2 pr-3 font-semibold">Name</th>
                      <th className="py-2 pr-3 font-semibold">Designation</th>
                      <th className="py-2 pr-3 font-semibold">Mobile</th>
                      <th className="py-2 font-semibold">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spocs.map((spoc, index) => (
                      <tr key={index} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-2 pr-3">{spoc.name}</td>
                        <td className="py-2 pr-3">{spoc.designation}</td>
                        <td className="py-2 pr-3 tabular-nums">{spoc.mobile}</td>
                        <td className="py-2">{spoc.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="border-t border-[var(--border)] px-5 py-3 text-right">
              <button
                type="button"
                onClick={() => setSpocOpen(false)}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--muted)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={confirmMode !== null}
        title={confirmMode === "deactivate" ? "Deactivate university" : "Activate university"}
        message={
          confirmMode === "deactivate"
            ? "This will mark the organisation as inactive."
            : "This will mark the organisation as active again."
        }
        detail={
          confirmMode === "deactivate"
            ? `"${name}" stays in the system with all data preserved. You can activate it again anytime from this list.`
            : `"${name}" will show as Active. Staff and workflows that depend on an active university can proceed as before.`
        }
        confirmLabel={confirmMode === "deactivate" ? "Yes, deactivate" : "Yes, activate"}
        cancelLabel="Cancel"
        danger={confirmMode === "deactivate"}
        busy={busy}
        onCancel={() => setConfirmMode(null)}
        onConfirm={() =>
          void setUniversityStatus(confirmMode === "deactivate" ? "INACTIVE" : "ACTIVE")
        }
      />
    </>
  );
}
