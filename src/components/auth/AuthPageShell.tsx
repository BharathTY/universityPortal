import type { ReactNode } from "react";
import { AuthMarketingPanel } from "./AuthMarketingPanel";
import { PORTAL_BRAND_NAME, PortalBrandLogo } from "@/components/portal-logo";
type AuthPageShellProps = {
  children: ReactNode;
  /** Main heading under the brand (e.g. sign-in or verify step). */
  title: string;
  /** Supporting line under the title. */
  subtitle: string;
  /** Optional row above the title (e.g. back link). */
  navSlot?: ReactNode;
  /** Extra classes for the main title (e.g. serif sizing). */
  titleClassName?: string;
  /** Extra classes for the left (form) column only. */
  formColumnClassName?: string;
};

export function AuthPageShell({
  children,
  title,
  subtitle,
  navSlot,
  titleClassName = "",
  formColumnClassName = "",
}: AuthPageShellProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-white lg:min-h-0 lg:grid-cols-2">
      <div
        className={`order-1 flex min-h-0 flex-col px-6 pb-10 pt-8 sm:px-10 sm:pt-10 lg:min-h-screen lg:px-14 lg:pb-12 ${formColumnClassName}`.trim()}
      >
        <div>
          <PortalBrandLogo variant="compact" />
        </div>
        <div className="flex flex-1 flex-col justify-center py-10 lg:py-12">
          <div className="mx-auto w-full max-w-md">
            {navSlot ? <div className="mb-4">{navSlot}</div> : null}
            <h1
              className={`text-3xl font-normal tracking-tight text-slate-900 sm:text-[2rem] ${titleClassName}`.trim()}
            >
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{subtitle}</p>
            {children}
          </div>
        </div>

        <p className="mt-auto text-center text-xs text-slate-400 sm:text-left">
          © {new Date().getFullYear()} {PORTAL_BRAND_NAME}
        </p>
      </div>

      <div className="order-2 min-h-0 lg:min-h-screen">
        <AuthMarketingPanel />
      </div>
    </div>
  );
}
