import type { AdmissionLeadStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  getMasterLeadsFilterOptions,
  getMasterLeadsSummary,
  listMasterLeads,
  type MasterLeadsSort,
} from "@/lib/master-leads-data";
import { requireMasterApi } from "@/lib/master-session";

const SORT_VALUES: MasterLeadsSort[] = ["latest", "oldest", "name", "university"];

function parseQuery(url: URL) {
  const statusRaw = url.searchParams.get("status")?.trim();
  const sortRaw = url.searchParams.get("sort")?.trim();
  const sort = SORT_VALUES.includes(sortRaw as MasterLeadsSort) ? (sortRaw as MasterLeadsSort) : "latest";

  return {
    q: url.searchParams.get("q")?.trim() || undefined,
    universityId: url.searchParams.get("universityId")?.trim() || undefined,
    streamId: url.searchParams.get("streamId")?.trim() || undefined,
    status: (statusRaw || undefined) as AdmissionLeadStatus | undefined,
    createdFrom: url.searchParams.get("createdFrom")?.trim() || undefined,
    createdTo: url.searchParams.get("createdTo")?.trim() || undefined,
    sort,
    page: Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1),
    pageSize: Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? "25") || 25)),
  };
}

export async function GET(req: Request) {
  const gate = await requireMasterApi();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const includeMeta = url.searchParams.get("meta") === "1";

  const query = parseQuery(url);
  const [result, summary, filterOptions] = await Promise.all([
    listMasterLeads(query),
    includeMeta ? getMasterLeadsSummary() : null,
    includeMeta ? getMasterLeadsFilterOptions() : null,
  ]);

  return NextResponse.json({
    ...result,
    leads: result.leads.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
    ...(summary ? { summary } : {}),
    ...(filterOptions ? { filterOptions } : {}),
  });
}
