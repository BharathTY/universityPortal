import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMaster } from "@/lib/roles";
import { hostelFeeAmountsFromDb } from "@/lib/hostel-fee-matrix";
import {
  UniversityDetailsForm,
  type StreamRowInitial,
} from "./university-details-form";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function UniversityDetailsPage({ params }: PageProps) {
  const session = await requireAuth();
  if (!isMaster(session.roles)) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const u = await prisma.university.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      location: true,
      streams: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, degreeType: true, streamFee: true },
      },
      hostelFees: {
        select: { gender: true, roomType: true, sharing: true, amount: true },
      },
    },
  });

  if (!u) {
    notFound();
  }

  const initialStreams: StreamRowInitial[] = u.streams.map((s) => ({
    id: s.id,
    name: s.name,
    degreeType: s.degreeType ?? "",
    streamFee: s.streamFee != null ? Number(s.streamFee.toString()) : null,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/master/universities"
        className="text-sm font-medium text-[var(--primary)] underline-offset-2 hover:underline"
      >
        ← Universities
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--foreground)]">University details</h1>
      <p className="mt-2 text-sm text-[var(--foreground-muted)]">
        Location, program pricing, and full hostel fee matrix.
      </p>
      <div className="mt-8">
        <UniversityDetailsForm
          universityId={u.id}
          universityName={u.name}
          initialLocation={u.location ?? ""}
          initialStreams={initialStreams}
          initialHostel={hostelFeeAmountsFromDb(u.hostelFees)}
        />
      </div>
    </div>
  );
}
