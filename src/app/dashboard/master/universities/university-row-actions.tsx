"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { ConfirmModal } from "@/components/confirm-modal";

type UniversityStatus = "ACTIVE" | "INACTIVE";

type Props = { universityId: string; name: string; status: UniversityStatus };

export function UniversityRowActions({ universityId, name, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [confirmMode, setConfirmMode] = React.useState<"deactivate" | "activate" | null>(null);

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
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmModal() {
    if (confirmMode === "deactivate") await setUniversityStatus("INACTIVE");
    else if (confirmMode === "activate") await setUniversityStatus("ACTIVE");
  }

  return (
    <>
      {status === "ACTIVE" ? (
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
        title={confirmMode === "deactivate" ? "Deactivate university" : "Activate university"}
        message={
          confirmMode === "deactivate"
            ? "This will mark the organisation as inactive."
            : "This will mark the organisation as active again."
        }
        detail={
          confirmMode === "deactivate"
            ? `“${name}” stays in the system with all data preserved. You can activate it again anytime from this list.`
            : `“${name}” will show as Active. Staff and workflows that depend on an active university can proceed as before.`
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
