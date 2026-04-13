import { Prisma } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isConsultant,
  isConsultantOnly,
  isMaster,
  isStudent,
  isUniversity,
  ROLES,
} from "@/lib/roles";

export type DashboardStat = {
  label: string;
  value: string;
  sub?: string;
  href?: string;
};

export type DashboardRecentStudent = {
  id: string;
  email: string;
  name: string | null;
  pendingInvite: boolean;
};

export type MasterUniversityRow = {
  id: string;
  name: string;
  code: string;
  consultantCount: number;
  studentCount: number;
};

export type DashboardSnapshot = {
  greetingName: string;
  email: string;
  university: { name: string; code: string } | null;
  stats: DashboardStat[];
  recentStudents: DashboardRecentStudent[];
  studentSelf?: {
    pendingInvite: boolean;
    universityName: string | null;
  };
  setupMessage: string | null;
  /** Master role: per-university breakdown */
  masterUniversities?: MasterUniversityRow[];
  totalConsultants?: number;
};

function buildStudentWhere(session: SessionPayload): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    roles: { some: { role: { slug: ROLES.student } } },
  };
  if (isConsultant(session.roles) && !isMaster(session.roles) && !isUniversity(session.roles)) {
    where.studentOfId = session.sub;
  } else if (isUniversity(session.roles) && session.universityId) {
    where.universityId = session.universityId;
  }
  return where;
}

const consultantSlugs = [ROLES.consultant, ROLES.counsellor, ROLES.consultantMaster] as const;

export async function getDashboardSnapshot(session: SessionPayload): Promise<DashboardSnapshot> {
  const empty: DashboardSnapshot = {
    greetingName: "there",
    email: session.email,
    university: null,
    stats: [],
    recentStudents: [],
    setupMessage: null,
  };

  try {
    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        name: true,
        email: true,
        inviteToken: true,
        university: { select: { name: true, code: true } },
      },
    });

    const greetingName =
      me?.name?.trim() || me?.email?.split("@")[0] || session.email.split("@")[0] || "there";
    const email = me?.email ?? session.email;
    const university = me?.university ?? null;

    if (isStudent(session.roles) && !isMaster(session.roles)) {
      return {
        ...empty,
        greetingName,
        email,
        university,
        stats: [
          {
            label: "University",
            value: university?.name ?? "—",
            sub: university ? university.code : undefined,
          },
          {
            label: "Invitation",
            value: me?.inviteToken ? "Pending acceptance" : "Accepted",
          },
        ],
        studentSelf: {
          pendingInvite: Boolean(me?.inviteToken),
          universityName: university?.name ?? null,
        },
      };
    }

    const studentWhere = buildStudentWhere(session);
    const pendingWhere: Prisma.UserWhereInput = {
      ...studentWhere,
      inviteToken: { not: null },
    };

    const [
      studentTotal,
      pendingInvites,
      universityCount,
      batchTotal,
      consultantCount,
      totalConsultantsAll,
      admissionLeadTotal,
    ] = await Promise.all([
      prisma.user.count({ where: studentWhere }),
      prisma.user.count({ where: pendingWhere }),
      isMaster(session.roles) ? prisma.university.count() : Promise.resolve(0),
      prisma.batch.count(),
      isUniversity(session.roles) && session.universityId
        ? prisma.user.count({
            where: {
              universityId: session.universityId,
              roles: { some: { role: { slug: { in: [...consultantSlugs] } } } },
            },
          })
        : Promise.resolve(0),
      isMaster(session.roles)
        ? prisma.user.count({
            where: {
              roles: { some: { role: { slug: { in: [...consultantSlugs] } } } },
            },
          })
        : Promise.resolve(0),
      isUniversity(session.roles) && session.universityId
        ? prisma.admissionLead.count({ where: { universityId: session.universityId } })
        : Promise.resolve(0),
    ]);

    let masterUniversities: MasterUniversityRow[] | undefined;
    if (isMaster(session.roles)) {
      const universities = await prisma.university.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true },
      });
      masterUniversities = await Promise.all(
        universities.map(async (u) => {
          const [consultantCount, studentCount] = await Promise.all([
            prisma.user.count({
              where: {
                universityId: u.id,
                roles: { some: { role: { slug: { in: [...consultantSlugs] } } } },
              },
            }),
            prisma.user.count({
              where: {
                universityId: u.id,
                roles: { some: { role: { slug: ROLES.student } } },
              },
            }),
          ]);
          return { id: u.id, name: u.name, code: u.code, consultantCount, studentCount };
        }),
      );
    }

    const stats: DashboardStat[] = [];

    if (isMaster(session.roles)) {
      stats.push(
        { label: "Universities", value: String(universityCount) },
        { label: "Consultants", value: String(totalConsultantsAll) },
        { label: "Students", value: String(studentTotal), href: "/dashboard/consultant/students" },
        { label: "Pending invites", value: String(pendingInvites), href: "/dashboard/consultant/students" },
      );
    } else if (isUniversity(session.roles) && session.universityId) {
      stats.push(
        {
          label: "Counsellors & consultants",
          value: String(consultantCount),
          sub: "Listed under Admissions",
          href: `/dashboard/university/${session.universityId}/admissions`,
        },
        {
          label: "Admission leads",
          value: String(admissionLeadTotal),
          sub: "Consultant codes on dashboard",
          href: `/dashboard/university/${session.universityId}/admissions`,
        },
        { label: "Students", value: String(studentTotal) },
        { label: "Pending invites", value: String(pendingInvites) },
        { label: "Batches", value: String(batchTotal), sub: "All batches", href: "/dashboard/batches" },
      );
    } else if (isConsultantOnly(session.roles)) {
      stats.push(
        { label: "My students", value: String(studentTotal), href: "/dashboard/consultant/students" },
        { label: "Pending invites", value: String(pendingInvites), href: "/dashboard/consultant/students" },
      );
    } else {
      stats.push({ label: "Students", value: String(studentTotal), href: "/dashboard/consultant/students" });
    }

    const recentStudents = await prisma.user.findMany({
      where: studentWhere,
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true,
        email: true,
        name: true,
        inviteToken: true,
      },
    });

    return {
      greetingName,
      email,
      university,
      stats,
      recentStudents: recentStudents.map((s) => ({
        id: s.id,
        email: s.email,
        name: s.name,
        pendingInvite: Boolean(s.inviteToken),
      })),
      setupMessage: null,
      masterUniversities,
      totalConsultants: isMaster(session.roles) ? totalConsultantsAll : undefined,
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return {
        ...empty,
        setupMessage:
          "Database tables are missing. From the project folder run: npx prisma db push && npm run db:seed",
      };
    }
    throw e;
  }
}
