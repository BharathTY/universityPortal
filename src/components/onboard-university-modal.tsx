"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  MasterUniversityCatalogCombobox,
  type MasterCatalogItem,
} from "@/components/master-university-catalog-combobox";

type OnboardUniversityModalProps = {
  open: boolean;
  onClose: () => void;
};

export function OnboardUniversityModal({ open, onClose }: OnboardUniversityModalProps) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<MasterCatalogItem | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSelected(null);
    setError(null);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function onboard() {
    if (!selected) {
      setError("Select a university from the catalog");
      return;
    }
    onClose();
    router.push(`/dashboard/master/universities/new?masterId=${encodeURIComponent(selected.id)}`);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Dismiss"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboard-university-title"
        className="relative z-[101] w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl"
      >
        <h2 id="onboard-university-title" className="font-serif text-xl font-semibold text-[var(--foreground)]">
          Onboard university
        </h2>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Choose a university from the master catalog. Location details will auto-fill on the next screen.
        </p>

        <div className="mt-5">
          <MasterUniversityCatalogCombobox
            value={selected}
            onChange={(item) => {
              setSelected(item);
              setError(null);
            }}
            error={error ?? undefined}
            openUp
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onboard}
            className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            Onboard
          </button>
        </div>
      </div>
    </div>
  );
}
