"use client";

import { Suspense } from "react";
import { ConsultantLeadsClient, type ConsultantLeadsClientProps } from "@/app/dashboard/consultant/leads/consultant-leads-client";

function LeadsFormFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm text-[var(--foreground-muted)]">Loading form…</p>
    </div>
  );
}

export function ConsultantLeadsClientWithBoundary(props: ConsultantLeadsClientProps) {
  return (
    <Suspense fallback={<LeadsFormFallback />}>
      <ConsultantLeadsClient {...props} />
    </Suspense>
  );
}
