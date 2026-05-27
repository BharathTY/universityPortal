"use client";

import * as React from "react";
import { OnboardUniversityModal } from "@/components/onboard-university-modal";

export function AddUniversityButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-blue-hover)]"
      >
        Add university
      </button>
      <OnboardUniversityModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
