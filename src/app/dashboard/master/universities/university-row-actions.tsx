"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

type Props = { universityId: string; name: string };

export function UniversityRowActions({ universityId, name }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function onDelete() {
    if (
      !confirm(
        `Deactivate "${name}"? The university will be marked inactive (data is kept).`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/master/universities/${universityId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        alert(data.error ?? "Could not deactivate");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onDelete()}
      disabled={busy}
      className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
    >
      {busy ? "…" : "Delete"}
    </button>
  );
}
