"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { ConfirmModal } from "@/components/confirm-modal";

type Props = { universityId: string; name: string };

export function UniversityRowActions({ universityId, name }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  async function onConfirmDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/master/universities/${universityId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error ?? "Could not deactivate");
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={busy}
        className="text-left text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
      >
        Delete
      </button>
      <ConfirmModal
        open={confirmOpen}
        title="Delete university"
        message="Are you sure you want to delete this university?"
        detail={`“${name}” will be marked inactive. Data is preserved and can be reviewed in the database.`}
        confirmLabel="Yes, deactivate"
        cancelLabel="Cancel"
        danger
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}
