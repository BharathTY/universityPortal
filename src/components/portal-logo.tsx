/** Shared portal brand strings. */
export const PORTAL_BRAND_NAME = "QSpiders Eduversity";
export const PORTAL_BRAND_TAGLINE = "University portal";

/** Vector mark — stacked portal + book (sidebar icon). */
export function PortalLogoSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2L4 6v10c0 5 8 8 8 8s8-3 8-8V6l-8-4z"
        fill="currentColor"
        fillOpacity={0.15}
      />
      <path
        d="M12 2L4 6l8 4 8-4-8-4zM4 6v10M20 6v10"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12h6M9 15.5h4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.95}
      />
    </svg>
  );
}

type PortalBrandLogoProps = {
  /** compact: login form header · default: full wordmark · sidebar: icon + two lines */
  variant?: "default" | "compact" | "sidebar" | "hero";
  className?: string;
  subtitle?: string;
};

/** QSpiders Eduversity wordmark + mark — replaces legacy Eduversity text logo. */
export function PortalBrandLogo({
  variant = "default",
  className = "",
  subtitle,
}: PortalBrandLogoProps) {
  const mark = (
    <span
      className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg brand-logo-gradient text-white shadow-md ring-1 ring-white/20"
      aria-hidden
    >
      <span className="font-heading text-[0.65rem] font-extrabold leading-none tracking-tight">QS</span>
    </span>
  );

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2.5 ${className}`.trim()}>
        {mark}
        <div className="leading-tight">
          <p className="font-heading text-xl font-bold tracking-tight text-[var(--primary)] sm:text-2xl">
            QSpiders <span className="text-[var(--foreground)]">Eduversity</span>
          </p>
        </div>
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className={`flex min-w-0 items-center gap-3 ${className}`.trim()}>
        {mark}
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-bold tracking-tight text-white">{PORTAL_BRAND_NAME}</p>
          <p className="truncate text-[0.7rem] text-slate-400">{subtitle ?? PORTAL_BRAND_TAGLINE}</p>
        </div>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className={className}>
        <p className="text-sm font-semibold uppercase tracking-wider text-[#f5a623]">Welcome to</p>
        <h2 className="mt-2 font-heading text-3xl font-bold leading-tight text-white sm:text-4xl">
          QSpiders Eduversity
        </h2>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`.trim()}>
      {mark}
      <p className="font-heading text-lg font-bold tracking-tight text-[var(--foreground)]">
        {PORTAL_BRAND_NAME}
      </p>
    </div>
  );
}
