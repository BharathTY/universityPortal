/** Right-hand marketing panel — vibrant blue brand panel. */
export function AuthMarketingPanel() {
  return (
    <div className="relative hidden min-h-screen flex-col justify-center overflow-hidden bg-[#1e6fe6] px-10 py-16 lg:flex lg:px-14">
      {/* Decorative shapes */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        aria-hidden
      >
        <div className="absolute -right-20 -top-32 h-96 w-96 rounded-full bg-[#0d5ccb]" />
        <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-[#3d8af7]" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-[#1560c4]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-lg">
        <p className="text-lg font-medium text-white/95">Welcome to</p>
        <h2 className="mt-2 text-3xl font-bold leading-tight text-white sm:text-4xl">
          Eduversity
        </h2>
        <p className="mt-5 text-base leading-relaxed text-white/90">
          Access your learning journey, track progress, and manage your courses—all in one
          place.
        </p>
        <ul className="mt-10 space-y-4">
          {[
            "Secure and reliable access",
            "Real-time data insights",
            "24/7 support availability",
          ].map((text) => (
            <li key={text} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-300/40 text-white"
                aria-hidden
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span className="text-[15px] font-medium leading-snug text-white">{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
