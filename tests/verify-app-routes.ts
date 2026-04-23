/**
 * Ensures sidebar nav targets and other critical in-app paths map to real App Router pages.
 * Dynamic segments are normalized (e.g. /dashboard/batches/abc → /dashboard/batches/[:batchId]).
 */
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { buildDashboardNav } from "../src/components/dashboard-nav-config";
import { ROLES } from "../src/lib/roles";

function collectNextAppRoutes(): Set<string> {
  const root = path.join(process.cwd(), "src", "app");
  const out = new Set<string>();
  function walk(absDir: string, segments: string[]) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    const hasPage = entries.some((e) => e.name === "page.tsx" || e.name === "page.ts");
    if (hasPage) {
      const p = segments.length ? `/${segments.join("/")}`.replace(/\/+/g, "/") : "/";
      out.add(p);
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name === "api") continue;
      const child = path.join(absDir, e.name);
      if (e.name.startsWith("(") && e.name.endsWith(")")) {
        walk(child, segments);
      } else {
        const seg =
          e.name.startsWith("[") && e.name.endsWith("]") ? `[:${e.name.slice(1, -1)}]` : e.name;
        walk(child, [...segments, seg]);
      }
    }
  }
  walk(root, []);
  return out;
}

/** Map a concrete browser path to the canonical pattern used in collectNextAppRoutes. */
export function canonicalizeAppPathname(pathname: string): string {
  let p = pathname.split("?")[0] ?? pathname;
  p = p.replace(/\/$/, "") || "/";

  const rules: Array<[RegExp, string]> = [
    [/^\/dashboard\/master\/consultants\/[^/]+\/admissions$/, "/dashboard/master/consultants/[:id]/admissions"],
    [/^\/dashboard\/master\/consultants\/[^/]+\/edit$/, "/dashboard/master/consultants/[:id]/edit"],
    [/^\/dashboard\/master\/universities\/[^/]+\/edit$/, "/dashboard/master/universities/[:id]/edit"],
    [
      /^\/dashboard\/university\/[^/]+\/admissions\/academic-years\/[^/]+$/,
      "/dashboard/university/[:universityId]/admissions/academic-years/[:yearId]",
    ],
    [
      /^\/dashboard\/university\/[^/]+\/admissions\/streams\/[^/]+$/,
      "/dashboard/university/[:universityId]/admissions/streams/[:streamId]",
    ],
    [
      /^\/dashboard\/university\/[^/]+\/admissions\/leads\/new$/,
      "/dashboard/university/[:universityId]/admissions/leads/new",
    ],
    [
      /^\/dashboard\/university\/[^/]+\/admissions\/academic-years$/,
      "/dashboard/university/[:universityId]/admissions/academic-years",
    ],
    [/^\/dashboard\/university\/[^/]+\/admissions\/streams$/, "/dashboard/university/[:universityId]/admissions/streams"],
    [/^\/dashboard\/university\/[^/]+\/(admissions|uni-admissions)$/, "/dashboard/university/[:universityId]/$1"],
    [/^\/dashboard\/university\/[^/]+\/applications$/, "/dashboard/university/[:universityId]/applications"],
    [/^\/dashboard\/university\/[^/]+\/consultants$/, "/dashboard/university/[:universityId]/consultants"],
    [/^\/dashboard\/batches\/[^/]+\/leads$/, "/dashboard/batches/[:batchId]/leads"],
    [/^\/dashboard\/batches\/[^/]+$/, "/dashboard/batches/[:batchId]"],
    [/^\/dashboard\/consultant\/students\/[^/]+\/edit$/, "/dashboard/consultant/students/[:userId]/edit"],
    [/^\/dashboard\/consultant\/students\/[^/]+$/, "/dashboard/consultant/students/[:userId]"],
    [/^\/ref\/[^/]+$/, "/ref/[:token]"],
    [/^\/dashboard\/university\/[^/]+$/, "/dashboard/university/[:universityId]"],
  ];

  for (const [re, rep] of rules) {
    if (re.test(p)) {
      p = p.replace(re, rep);
      break;
    }
  }
  return p;
}

export function verifyAppRoutes(): void {
  const routes = collectNextAppRoutes();

  const staticMustExist = [
    "/",
    "/login",
    "/login/verify",
    "/invite/accept",
    "/dashboard",
    "/dashboard/student",
    "/dashboard/student/application",
    "/dashboard/master",
    "/dashboard/master/universities",
    "/dashboard/master/universities/new",
    "/dashboard/master/consultants",
    "/dashboard/master/consultants/new",
    "/dashboard/master/applications",
    "/dashboard/university",
    "/dashboard/consultant",
    "/dashboard/consultant/leads",
    "/dashboard/consultant/students",
    "/dashboard/batches",
    "/dashboard/applications",
    "/dashboard/campaigns",
    "/dashboard/coupons",
    "/dashboard/counsellor",
    "/dashboard/schemes",
    "/dashboard/submissions",
  ];

  for (const r of staticMustExist) {
    assert.ok(routes.has(r), `Expected App Router page for path ${r}`);
  }

  const navChecks: Array<{ label: string; roles: string[]; universityId?: string | null }> = [
    { label: "student", roles: [ROLES.student] },
    { label: "master", roles: [ROLES.master] },
    { label: "consultant", roles: [ROLES.consultant] },
    { label: "university", roles: [ROLES.university], universityId: "seed-uni-placeholder" },
  ];

  for (const { label, roles, universityId } of navChecks) {
    const nav = buildDashboardNav(roles, { universityId: universityId ?? undefined });
    for (const group of nav) {
      for (const item of group.items) {
        const c = canonicalizeAppPathname(item.href);
        assert.ok(routes.has(c), `[${label} nav] missing route for ${item.href} → canonical ${c}`);
      }
    }
  }
}
