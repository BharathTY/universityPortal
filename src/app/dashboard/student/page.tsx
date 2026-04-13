import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStudent } from "@/lib/roles";

export default async function StudentHomePage() {
  const session = await requireAuth();
  if (!isStudent(session.roles)) {
    redirect("/dashboard");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: {
      university: true,
      studentOf: { select: { email: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Student portal</h1>
      <p className="mt-2 text-[var(--foreground-muted)]">
        Continue your application, pay fees, and book visits — wireframes reference a multi-step flow; this page is
        the landing area for the <strong className="text-[var(--foreground)]">Student</strong> role (OTP login
        unchanged).
      </p>

      <div className="mt-8 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div>
          <p className="text-xs font-medium uppercase text-[var(--foreground-muted)]">University</p>
          <p className="text-[var(--foreground)]">{user?.university?.name ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-[var(--foreground-muted)]">Assigned consultant</p>
          <p className="text-[var(--foreground)]">{user?.studentOf?.email ?? "—"}</p>
        </div>
      </div>

      <p className="mt-6 text-sm text-[var(--foreground-muted)]">
        Next steps: application details, registration fee (e.g. Razorpay), and college tour — will plug in here as you
        build APIs.
      </p>
    </div>
  );
}
