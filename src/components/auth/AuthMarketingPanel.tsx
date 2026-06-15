import { PortalBrandLogo } from "@/components/portal-logo";

/** Right-hand marketing panel — navy hero with QSpiders Eduversity branding. */
export function AuthMarketingPanel() {
  return (
    <div className="relative flex min-h-[min(100vh,22rem)] flex-col justify-center overflow-hidden bg-[#0f172a] px-8 py-14 font-sans sm:px-10 lg:min-h-screen lg:px-14 lg:py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-[#c0392b]/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#f5a623]/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[min(70%,28rem)] w-[min(85vw,36rem)] translate-x-1/4 translate-y-1/4 rounded-[100%] bg-[#1e293b]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto w-full max-w-lg">
        <PortalBrandLogo variant="hero" />
        <p className="mt-5 text-base leading-relaxed text-slate-300">
          Your master&apos;s degree abroad begins here — manage admissions, leads, and payments in one trusted platform.
        </p>
        <ul className="mt-10 space-y-4">
          {[
            "200+ university partners globally",
            "End-to-end lead & payment tracking",
            "Dedicated consultant & student portals",
          ].map((text) => (
            <li key={text} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#c0392b]/90 text-white ring-2 ring-[#f5a623]/30"
                aria-hidden
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span className="pt-0.5 text-[15px] font-medium leading-snug text-white">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
