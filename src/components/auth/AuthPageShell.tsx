import Link from "next/link";
import type { ReactNode } from "react";
import { AuthMarketingPanel } from "./AuthMarketingPanel";

type AuthPageShellProps = {
  children: ReactNode;
  /** Main heading under the brand (e.g. sign-in or verify step). */
  title: string;
  /** Supporting line under the title. */
  subtitle: string;
  /** Optional row above the title (e.g. back link). */
  navSlot?: ReactNode;
};

export function AuthPageShell({ children, title, subtitle, navSlot }: AuthPageShellProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left: white form column — fixed light styling for auth */}
      <div className="flex min-h-screen flex-col bg-white px-6 pb-8 pt-8 sm:px-10 sm:pt-10 lg:px-16">
        <div>
          <p className="text-2xl font-bold tracking-tight text-[#1e6fe6]">Eduversity</p>
        </div>

        <div className="flex flex-1 flex-col justify-center py-10">
          <div className="mx-auto w-full max-w-md">
            {navSlot ? <div className="mb-4">{navSlot}</div> : null}
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
            {children}
          </div>
        </div>

        <p className="mt-auto text-center text-xs text-slate-400 sm:text-left">
          © {new Date().getFullYear()} Eduversity
        </p>
      </div>

      <AuthMarketingPanel />
    </div>
  );
}

/** Optional footer link row under forms (e.g. sign up). */
export function AuthFooterLink({
  prompt,
  linkText,
  href,
}: {
  prompt: string;
  linkText: string;
  href: string;
}) {
  return (
    <p className="mt-8 text-center text-sm text-slate-500">
      {prompt}{" "}
      <Link href={href} className="font-medium text-[#1e6fe6] hover:underline">
        {linkText}
      </Link>
    </p>
  );
}
