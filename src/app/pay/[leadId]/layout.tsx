import { Suspense } from "react";

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-4 py-16 text-center text-sm text-[var(--foreground-muted)]">
          Loading payment…
        </main>
      }
    >
      {children}
    </Suspense>
  );
}
