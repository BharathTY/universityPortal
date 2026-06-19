"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ConfirmModal } from "@/components/confirm-modal";

type AccountStatus = "ACTIVE" | "INACTIVE";

type Props = {
  userId: string;
  name: string | null;
  email: string;
  accountStatus: AccountStatus;
};

export function ConsultantRowActionsMenu({ userId, name, email, accountStatus }: Props) {
  const router = useRouter();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [confirmMode, setConfirmMode] = React.useState<"deactivate" | "activate" | null>(null);

  const label = name?.trim() || email;

  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  async function setAccountStatus(next: AccountStatus) {
    setBusy(true);
    try {
      const res = await fetch(`/api/master/consultants/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountStatus: next }),
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
      <div ref={rootRef} className="relative inline-block text-left">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={busy}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--background)] text-lg leading-none text-[var(--foreground-muted)] hover:bg-[var(--muted)]/50 disabled:opacity-50"
          title="Actions"
        >
          ⋮
        </button>
        {open ? (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-lg border border-[var(--border)] bg-[var(--card)] py-1 shadow-lg"
          >
            <Link
              href={`/dashboard/master/consultants/${userId}/admissions`}
              role="menuitem"
              className="block px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)]/50"
              onClick={() => setOpen(false)}
            >
              View leads
            </Link>
            <Link
              href={`/dashboard/master/consultants/${userId}/edit`}
              role="menuitem"
              className="block px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)]/50"
              onClick={() => setOpen(false)}
            >
              Edit
            </Link>
            {accountStatus === "ACTIVE" ? (
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-[var(--muted)]/50 disabled:opacity-50"
                onClick={() => onMenuAction(() => setConfirmMode("deactivate"))}
              >
                Deactivate
              </button>
            ) : (
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                className="block w-full px-3 py-2 text-left text-sm text-emerald-700 hover:bg-[var(--muted)]/50 dark:text-emerald-400 disabled:opacity-50"
                onClick={() => onMenuAction(() => setConfirmMode("activate"))}
              >
                Activate
              </button>
            )}
          </div>
        ) : null}
      </div>

      <ConfirmModal
        open={confirmMode !== null}
        title={confirmMode === "deactivate" ? "Deactivate admission partner" : "Activate admission partner"}
        message={
          confirmMode === "deactivate"
            ? "They will not be able to sign in while inactive."
            : "They will be able to sign in again."
        }
        detail={
          confirmMode === "deactivate"
            ? `“${label}” remains in the system with assignments preserved.`
            : `“${label}” can use the portal again according to their university assignments.`
        }
        confirmLabel={confirmMode === "deactivate" ? "Yes, deactivate" : "Yes, activate"}
        cancelLabel="Cancel"
        danger={confirmMode === "deactivate"}
        busy={busy}
        onCancel={() => setConfirmMode(null)}
        onConfirm={() =>
          void (confirmMode === "deactivate" ? setAccountStatus("INACTIVE") : setAccountStatus("ACTIVE"))
        }
      />
    </>
  );
}
