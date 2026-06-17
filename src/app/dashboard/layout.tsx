import { requireAuth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { isMaster, isStudent } from "@/lib/roles";
import { PORTAL_BRAND_NAME, PORTAL_BRAND_TAGLINE } from "@/components/portal-logo";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const studentView = isStudent(session.roles) && !isMaster(session.roles);
  const brandTitle = PORTAL_BRAND_NAME;
  const brandSubtitle = studentView ? "Student portal" : PORTAL_BRAND_TAGLINE;
  return (
    <div className="fixed inset-0 overflow-hidden bg-[var(--background)]">
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
