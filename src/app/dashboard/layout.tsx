import { requireAuth } from "@/lib/auth";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <DashboardHeader email={session.email} roles={session.roles} />
      <DashboardShell roles={session.roles} universityId={session.universityId}>
        {children}
      </DashboardShell>
    </div>
  );
}
