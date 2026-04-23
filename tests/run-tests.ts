/**
 * Logic tests — no DB. Run: `npx tsx tests/run-tests.ts`
 */
import assert from "node:assert";
import type { PrismaClient } from "@prisma/client";
import { resolveAcademicYearIdWithPrisma } from "../src/lib/consultant-default-year";
import { isAdmissionLeadRoleSlug } from "../src/lib/admission-lead-role";
import { ADMISSION_PARTNER_ROLE_SLUGS } from "../src/lib/admission-partner-slugs";
import { buildDashboardNav, isNavActive } from "../src/components/dashboard-nav-config";
import {
  ROLES,
  canAccessLeadsAndBatches,
  formatRoleLabel,
  formatTeamMemberRole,
  isConsultant,
  isConsultantOnly,
  isMaster,
  isStudent,
  isUniversity,
} from "../src/lib/roles";

async function main() {
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      passed += 1;
      console.log(`  ✓ ${name}`);
    } catch (e) {
      failed += 1;
      console.error(`  ✗ ${name}`);
      console.error(e);
    }
  }

  function section(title: string) {
    console.log(`\n${title}`);
  }

  console.log("University Portal — logic tests\n");

  section("formatRoleLabel");
  await test("consultant family maps to Admission Partner", () => {
    assert.strictEqual(formatRoleLabel(ROLES.consultant), "Admission Partner");
    assert.strictEqual(formatRoleLabel(ROLES.counsellor), "Admission Partner");
    assert.strictEqual(formatRoleLabel(ROLES.consultantMaster), "Admission Partner");
    assert.strictEqual(formatRoleLabel(ROLES.qspidersBranch), "Admission Partner");
  });
  await test("other slugs title-case with underscores", () => {
    assert.strictEqual(formatRoleLabel(ROLES.student), "Student");
    assert.strictEqual(formatRoleLabel(ROLES.university), "University");
  });
  await test("formatTeamMemberRole distinguishes team roster", () => {
    assert.strictEqual(formatTeamMemberRole(ROLES.counsellor), "Counsellor");
    assert.strictEqual(formatTeamMemberRole(ROLES.consultantMaster), "Manager");
    assert.strictEqual(formatTeamMemberRole(ROLES.qspidersBranch), "Branch");
    assert.strictEqual(formatTeamMemberRole(ROLES.consultant), "Admission partner");
  });

  section("isConsultant / isConsultantOnly");
  await test("qspiders_branch is consultant and consultant-only when alone", () => {
    assert.strictEqual(isConsultant([ROLES.qspidersBranch]), true);
    assert.strictEqual(isConsultantOnly([ROLES.qspidersBranch]), true);
  });
  await test("consultant + university staff is not consultant-only", () => {
    assert.strictEqual(isConsultantOnly([ROLES.consultant, ROLES.university]), false);
  });

  section("canAccessLeadsAndBatches");
  await test("branch and master can access", () => {
    assert.strictEqual(canAccessLeadsAndBatches([ROLES.qspidersBranch]), true);
    assert.strictEqual(canAccessLeadsAndBatches([ROLES.master]), true);
  });
  await test("plain student cannot", () => {
    assert.strictEqual(canAccessLeadsAndBatches([ROLES.student]), false);
  });

  section("ADMISSION_PARTNER_ROLE_SLUGS");
  await test("length and uniqueness", () => {
    assert.strictEqual(ADMISSION_PARTNER_ROLE_SLUGS.length, 4);
    assert.strictEqual(new Set(ADMISSION_PARTNER_ROLE_SLUGS).size, 4);
  });

  section("isAdmissionLeadRoleSlug");
  await test("consultant slugs accepted", () => {
    assert.strictEqual(isAdmissionLeadRoleSlug("consultant"), true);
    assert.strictEqual(isAdmissionLeadRoleSlug("qspiders_branch"), true);
  });
  await test("student rejected", () => {
    assert.strictEqual(isAdmissionLeadRoleSlug("student"), false);
  });

  section("buildDashboardNav");
  await test("student: Overview + Application only", () => {
    const nav = buildDashboardNav([ROLES.student]);
    assert.strictEqual(nav.length, 1);
    assert.deepStrictEqual(
      nav[0]!.items.map((i) => ({ href: i.href, label: i.label })),
      [
        { href: "/dashboard", label: "Overview" },
        { href: "/dashboard/student/application", label: "Application" },
      ],
    );
  });
  await test("master: includes Admission partners", () => {
    const nav = buildDashboardNav([ROLES.master]);
    const labels = nav.flatMap((g) => g.items.map((i) => i.label));
    assert.ok(labels.includes("Admission partners"));
  });
  await test("consultant: no Home dashboard; Work shows Universities hub + Partner leads", () => {
    const nav = buildDashboardNav([ROLES.consultant]);
    assert.ok(!nav.some((g) => g.title === "Home"));
    const items = nav.flatMap((g) => g.items);
    assert.ok(items.some((i) => i.href === "/dashboard/university" && i.label === "Universities"));
    assert.ok(items.some((i) => i.href === "/dashboard/consultant/leads" && i.label === "Partner leads"));
    assert.strictEqual(
      items.some((i) => i.label === "Leads"),
      false,
    );
  });
  await test("qspiders_branch nav matches consultant nav", () => {
    const a = JSON.stringify(buildDashboardNav([ROLES.consultant]));
    const b = JSON.stringify(buildDashboardNav([ROLES.qspidersBranch]));
    assert.strictEqual(a, b);
  });
  await test("university role with id: admissions hrefs include universityId", () => {
    const nav = buildDashboardNav([ROLES.university], { universityId: "uni-abc" });
    const hrefs = nav.flatMap((g) => g.items.map((i) => i.href));
    assert.ok(hrefs.includes("/dashboard/university/uni-abc/admissions"));
  });

  section("isNavActive");
  await test("master consultants nested path active", () => {
    assert.strictEqual(
      isNavActive("/dashboard/master/consultants/x/admissions", "/dashboard/master/consultants"),
      true,
    );
  });
  await test("university admissions exact only", () => {
    const h = "/dashboard/university/u1/admissions";
    assert.strictEqual(isNavActive("/dashboard/university/u1/admissions", h), true);
    assert.strictEqual(isNavActive("/dashboard/university/u1/admissions/streams", h), false);
  });
  await test("dashboard root exact", () => {
    assert.strictEqual(isNavActive("/dashboard", "/dashboard"), true);
    assert.strictEqual(isNavActive("/dashboard/consultant", "/dashboard"), false);
  });

  section("resolveAcademicYearIdWithPrisma (in-memory mock)");
  await test("preferred id wins when row exists", async () => {
    const db = {
      academicYear: {
        findFirst: async (args: { where: { id?: string; universityId?: string } }) => {
          if (args.where.id === "y1" && args.where.universityId === "u1") return { id: "y1" };
          return null;
        },
      },
    } as Pick<PrismaClient, "academicYear">;
    const id = await resolveAcademicYearIdWithPrisma(db, "u1", "y1");
    assert.strictEqual(id, "y1");
  });

  await test("invalid preferred then first by order", async () => {
    let calls = 0;
    const db = {
      academicYear: {
        findFirst: async (args: { where: { id?: string; universityId?: string }; orderBy?: unknown }) => {
          calls += 1;
          if (args.where.id) return null;
          return { id: "first-year" };
        },
      },
    } as Pick<PrismaClient, "academicYear">;
    const id = await resolveAcademicYearIdWithPrisma(db, "u1", "bad");
    assert.strictEqual(id, "first-year");
    assert.strictEqual(calls, 2);
  });

  await test("no preferred: null when no years", async () => {
    const db = {
      academicYear: {
        findFirst: async () => null,
      },
    } as Pick<PrismaClient, "academicYear">;
    assert.strictEqual(await resolveAcademicYearIdWithPrisma(db, "u1", null), null);
  });

  section("Demo seed accounts (prisma/seed.ts — JWT roles after OTP)");
  /** Real DB uses a cuid; navigation only needs a stable id string. */
  const seedUniversityId = "seed-qsp-u1-record-id";

  await test("master@university.local — Master Admin", () => {
    const roles = [ROLES.master];
    assert.strictEqual(isMaster(roles), true);
    assert.strictEqual(canAccessLeadsAndBatches(roles), true);
    const items = buildDashboardNav(roles).flatMap((g) => g.items);
    assert.ok(items.some((i) => i.href === "/dashboard/master/universities"));
    assert.ok(items.some((i) => i.href === "/dashboard/master/consultants"));
    assert.ok(items.some((i) => i.href === "/dashboard/master/applications"));
  });

  await test("university@university.local — University staff (linked to QSP-U1 in seed)", () => {
    const roles = [ROLES.university];
    assert.strictEqual(isUniversity(roles), true);
    assert.strictEqual(isMaster(roles), false);
    assert.strictEqual(canAccessLeadsAndBatches(roles), true);
    const items = buildDashboardNav(roles, { universityId: seedUniversityId }).flatMap((g) => g.items);
    assert.ok(items.some((i) => i.href === `/dashboard/university/${seedUniversityId}/admissions`));
    assert.strictEqual(
      items.some((i) => i.href.includes("/applications")),
      false,
      "Applications removed from university sidebar (use Admissions only)",
    );
  });

  await test("consultant@university.local — Admission partner", () => {
    const roles = [ROLES.consultant];
    assert.strictEqual(isConsultantOnly(roles), true);
    assert.strictEqual(isConsultant(roles), true);
    assert.strictEqual(canAccessLeadsAndBatches(roles), true);
    const items = buildDashboardNav(roles).flatMap((g) => g.items);
    assert.ok(items.some((i) => i.href === "/dashboard/university"));
    assert.ok(items.some((i) => i.href === "/dashboard/consultant/leads"));
    assert.ok(items.some((i) => i.href === "/dashboard/consultant/students"));
  });

  await test("student@university.local — Student", () => {
    const roles = [ROLES.student];
    assert.strictEqual(isStudent(roles), true);
    assert.strictEqual(canAccessLeadsAndBatches(roles), false);
    const nav = buildDashboardNav(roles);
    assert.strictEqual(nav[0]?.title, "Dashboard");
    const items = nav[0]?.items ?? [];
    assert.ok(items.some((i) => i.href === "/dashboard"));
    assert.ok(items.some((i) => i.href === "/dashboard/student/application"));
  });

  section("Role combinations (edge)");
  await test("student+master: buildDashboardNav yields master (master branch first)", () => {
    assert.strictEqual(isStudent([ROLES.student, ROLES.master]), true);
    assert.strictEqual(isMaster([ROLES.student, ROLES.master]), true);
    const nav = buildDashboardNav([ROLES.student, ROLES.master]);
    assert.ok(nav.some((g) => g.title === "Master admin"));
  });

  console.log(`\n——\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

void main();
