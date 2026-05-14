/** Right-hand (or stacked) marketing panel — blue brand panel matching Eduversity sign-in art. */
export function AuthMarketingPanel() {
  return (
    <div className="relative flex min-h-[min(100vh,22rem)] flex-col justify-center overflow-hidden bg-[#2563eb] px-8 py-14 font-sans sm:px-10 lg:min-h-screen lg:px-14 lg:py-16">
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[min(70%,28rem)] w-[min(85vw,36rem)] translate-x-1/4 translate-y-1/4 rounded-[100%] bg-[#1d4ed8]/90"
        aria-hidden
      />

      <div className="relative z-10 mx-auto w-full max-w-lg">
        <p className="text-lg font-medium text-white/95">Welcome to</p>
        <h2 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">Eduversity</h2>
        <p className="mt-5 text-base leading-relaxed text-white/90">
          Access your learning journey, track progress, and manage your courses—all in one place.
        </p>
        <ul className="mt-10 space-y-4">
          {["Secure and reliable access", "Real-time data insights", "24/7 support availability"].map((text) => (
            <li key={text} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-300/45 text-white"
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
