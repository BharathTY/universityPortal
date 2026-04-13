import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { canAccessLeadsAndBatches } from "@/lib/roles";
import { getManagedStudentOrNull } from "@/lib/managed-student-access";
import { EditStudentForm } from "@/app/dashboard/consultant/students/[userId]/edit/edit-student-form";

type PageProps = { params: Promise<{ userId: string }> };

export default async function ManagedStudentEditPage(props: PageProps) {
  const session = await requireAuth();
  if (!canAccessLeadsAndBatches(session.roles)) {
    redirect("/dashboard");
  }

  const { userId } = await props.params;
  const user = await getManagedStudentOrNull(userId, session);
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href={`/dashboard/consultant/students/${user.id}`}
          className="text-sm font-medium text-[var(--primary)] underline underline-offset-2 hover:no-underline"
        >
          ← Back to user
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Edit user</h1>
      <p className="mt-1 text-[var(--foreground-muted)]">Update the student&apos;s display name.</p>

      <EditStudentForm userId={user.id} initialName={user.name ?? ""} email={user.email} />
    </div>
  );
}
