import { redirect } from "next/navigation";

import { ConsultantLeadsClient } from "@/app/dashboard/consultant/leads/consultant-leads-client";

import { requireAuth } from "@/lib/auth";

import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";

import { prisma } from "@/lib/prisma";

import { isConsultantOnly } from "@/lib/roles";



export const dynamic = "force-dynamic";



type PageProps = { searchParams: Promise<{ universityId?: string }> };



export default async function ConsultantAddLeadPage({ searchParams }: PageProps) {

  const session = await requireAuth();

  if (!isConsultantOnly(session.roles)) {

    redirect("/dashboard");

  }



  const sp = await searchParams;

  const requested = sp.universityId?.trim();

  const allowed = await getAllowedConsultantUniversityIds(session.sub);



  if (allowed.length === 0) {

    redirect("/dashboard/consultant/leads");

  }



  const universities = await prisma.university.findMany({

    where: { id: { in: allowed }, status: "ACTIVE" },

    orderBy: { name: "asc" },

    select: {

      id: true,

      name: true,

      code: true,

      streams: {

        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],

        select: { id: true, name: true },

      },

      academicYears: {

        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],

        select: { id: true, label: true },

      },

    },

  });



  if (universities.length === 0) {

    redirect("/dashboard/consultant/leads");

  }



  const initialUniversityId =

    requested && allowed.includes(requested) ? requested : universities[0]!.id;



  const initial = universities.find((u) => u.id === initialUniversityId) ?? universities[0]!;



  return (

    <ConsultantLeadsClient

      layoutMode="addOnly"

      universityId={initial.id}

      universityName={initial.name}

      universityCode={initial.code}

      streams={initial.streams}

      academicYears={initial.academicYears}

      universityOptions={universities}

      initialUniversityId={initialUniversityId}

      showBulkUpload={false}

      setActiveUniversityOnMount

    />

  );

}

