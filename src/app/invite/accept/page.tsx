import { Suspense } from "react";
import { InviteAcceptClient } from "./invite-accept-client";

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
          <p className="text-sm text-[var(--foreground-muted)]">Loading…</p>
        </div>
      }
    >
      <InviteAcceptClient />
    </Suspense>
  );
}
