import { redirect } from "next/navigation";

import { ConsultantStudentLeadsClient } from "@/app/dashboard/consultant/leads/consultant-student-leads-client";

import { requireAuth } from "@/lib/auth";

import {

  getConsultantLeadsFilterOptions,

  getConsultantLeadsSummary,

  listConsultantLeads,

  parseConsultantLeadsQueryFromSearchParams,

} from "@/lib/consultant-leads-data";

import { getAllowedConsultantUniversityIds } from "@/lib/consultant-universities";

import { prisma } from "@/lib/prisma";

import { isConsultantOnly } from "@/lib/roles";

function studentPortalBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    "http://localhost:7777"
  ).replace(/\/$/, "");
}



export const dynamic = "force-dynamic";



type PageProps = {

  searchParams: Promise<Record<string, string | string[] | undefined>>;

};



export default async function ConsultantLeadsPage({ searchParams }: PageProps) {

  const session = await requireAuth();

  if (!isConsultantOnly(session.roles)) {

    redirect("/dashboard");

  }



  const sp = await searchParams;

  const query = parseConsultantLeadsQueryFromSearchParams(sp);

  const allowedIds = await getAllowedConsultantUniversityIds(session.sub);



  const [summary, filterOptions, list, universitiesWithStreams] = await Promise.all([

    getConsultantLeadsSummary(session.sub),

    getConsultantLeadsFilterOptions(session.sub),

    listConsultantLeads(session.sub, query),

    allowedIds.length === 0

      ? Promise.resolve([])

      : prisma.university.findMany({

          where: { id: { in: allowedIds } },

          orderBy: { name: "asc" },

          select: {

            id: true,

            name: true,

            code: true,

            streams: {

              orderBy: [{ sortOrder: "asc" }, { name: "asc" }],

              select: { id: true, name: true },

            },

          },

        }),

  ]);



  return (

    <ConsultantStudentLeadsClient

      initialSummary={summary}

      initialFilterOptions={filterOptions}

      initialLeads={list.leads.map((l) => ({

        ...l,

        createdAt: l.createdAt.toISOString(),

      }))}

      initialTotal={list.total}

      initialPage={list.page}

      initialPageSize={list.pageSize}

      initialTotalPages={list.totalPages}

      initialQuery={query}

      universities={universitiesWithStreams}

      studentPortalUrl={studentPortalBaseUrl()}

    />

  );

}

