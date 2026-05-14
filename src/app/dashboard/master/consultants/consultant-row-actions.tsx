"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { ConfirmModal } from "@/components/confirm-modal";

type AccountStatus = "ACTIVE" | "INACTIVE";

type Props = { userId: string; name: string | null; email: string; accountStatus: AccountStatus };

export function ConsultantRowActions({ userId, name, email, accountStatus }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [confirmMode, setConfirmMode] = React.useState<"deactivate" | "activate" | null>(null);

  const label = name?.trim() || email;

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
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmModal() {
    if (confirmMode === "deactivate") await setAccountStatus("INACTIVE");
    else if (confirmMode === "activate") await setAccountStatus("ACTIVE");
  }

  return (
    <>
      {accountStatus === "ACTIVE" ? (
        <button
          type="button"
          onClick={() => setConfirmMode("deactivate")}
          disabled={busy}
          className="text-left text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
        >
          Deactivate
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmMode("activate")}
          disabled={busy}
          className="text-left text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400 disabled:opacity-50"
        >
          Activate
        </button>
      )}
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
            ? `“${label}” remains in the system with assignments preserved. You can activate the account again from this list.`
            : `“${label}” can use the portal again according to their university assignments (active universities only).`
        }
        confirmLabel={confirmMode === "deactivate" ? "Yes, deactivate" : "Yes, activate"}
        cancelLabel="Cancel"
        danger={confirmMode === "deactivate"}
        busy={busy}
        onCancel={() => setConfirmMode(null)}
        onConfirm={() => void onConfirmModal()}
      />
    </>
  );
}
