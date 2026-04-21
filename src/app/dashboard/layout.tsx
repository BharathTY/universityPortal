import { requireAuth } from "@/lib/auth";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardShell } from "@/components/dashboard-shell";
import { isMaster, isStudent } from "@/lib/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const studentView = isStudent(session.roles) && !isMaster(session.roles);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <DashboardHeader email={session.email} roles={session.roles} />
      <DashboardShell
        roles={session.roles}
        universityId={session.universityId}
        brandTitle={studentView ? "Student Portal" : "University Portal"}
        brandSubtitle={studentView ? "Your application hub" : "portal.ams"}
      >
        {children}
      </DashboardShell>
    </div>
  );
}
