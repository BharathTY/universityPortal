import { requireAuth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { SessionInactivityGuard } from "@/components/session-inactivity-guard";
import { isMaster, isStudent } from "@/lib/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const studentView = isStudent(session.roles) && !isMaster(session.roles);
  const brandTitle = studentView ? "Student Portal" : "University Portal";
  const brandSubtitle = studentView ? "Study abroad · QSpiders" : "Backed by QSpiders";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <SessionInactivityGuard />
      <DashboardShell
        email={session.email}
        roles={session.roles}
        universityId={session.universityId}
        brandTitle={brandTitle}
        brandSubtitle={brandSubtitle}
      >
        {children}
      </DashboardShell>
    </div>
  );
}
