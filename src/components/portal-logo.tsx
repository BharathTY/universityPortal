/** Vector mark: stacked portal + book — shared by sidebar and top header. */
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
