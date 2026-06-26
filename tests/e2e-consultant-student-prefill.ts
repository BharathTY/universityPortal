/**
 * E2E: Consultant creates lead → READY_TO_PAY → student prefill → profile submit → payment.
 * Requires dev server at E2E_BASE_URL and seeded DB.
 */
import assert from "node:assert";
import { PrismaClient } from "@prisma/client";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function makePngFile(name = "photo.png"): File {
  return new File([PNG_1X1], name, { type: "image/png" });
}

async function test(name: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(e);
    return false;
  }
}

async function loginCookie(baseUrl: string, email: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  assert.strictEqual(res.status, 200, `login failed for ${email}: ${await res.text()}`);
  const cookie = res.headers.get("set-cookie") ?? "";
  const sessionCookie = cookie.split(";")[0] ?? "";
  assert.ok(sessionCookie.includes("UP_SESSION"), `missing session for ${email}`);
  return sessionCookie;
}

function buildLeadPayload(ctx: {
  universityId: string;
  streamId: string;
  academicYearId: string;
  email: string;
}) {
  return {
    universityId: ctx.universityId,
    academicYearId: ctx.academicYearId,
    streamId: ctx.streamId,
    programType: "UG",
    admissionDegreeType: "Bachelor of Technology",
    studentTitle: "Mr",
    fullName: "E2E Prefill",
    email: ctx.email,
    mobile: "9876543210",
    gender: "Male",
    dateOfBirth: "2005-06-15",
    category: "GENERAL",
    caste: "General",
    religion: "Hindu",
    nationality: "India",
    guardianName: "E2E Parent",
    guardianMobile: "9876543211",
    uidaiNumber: "123456789012",
    abcApaarId: "ABC123456",
    admissionState: "Karnataka",
    addressLine1: "123 Test Street",
    addressLine2: "Near Park",
    city: "Bangalore",
    district: "Bangalore Urban",
    state: "Karnataka",
    country: "India",
    pincode: "560001",
    correspondenceAddress: "123 Test Street\nNear Park\nBangalore, Bangalore Urban\nKarnataka, India, 560001",
    sslcSchool: "E2E High School",
    sslcBoard: "STATE_BOARD_SSLC",
    sslcYear: "2020",
    sslcResultType: "PERCENTAGE",
    sslcPercent: "92.5",
    qualificationType: "PUC",
    qualInstitution: "E2E PU College",
    qualBoardUniversity: "Karnataka PU Board",
    qualYear: "2022",
    qualResultType: "PERCENTAGE",
    qualScore: "88",
    hasEntranceExams: true,
    entranceExams: [
      {
        examName: "KCET",
        scoreRank: "Rank 1200",
        examYear: "2022",
      },
    ],
  };
}

export async function runConsultantStudentPrefillE2e(
  baseUrl: string,
): Promise<{ passed: number; failed: number }> {
  console.log(`\nConsultant → student prefill E2E (${baseUrl})`);
  let passed = 0;
  let failed = 0;

  const prisma = new PrismaClient();
  const runId = Date.now();
  const studentEmail = `e2e-prefill-${runId}@university.local`;
  let leadId: string | null = null;
  let applicationId: string | null = null;
  let studentUserId: string | null = null;

  async function step(name: string, fn: () => Promise<void>) {
    const ok = await test(name, fn);
    if (ok) passed++;
    else failed++;
  }

  try {
    await step("Setup — ensure QSP university has application fee", async () => {
      const uni = await prisma.university.findFirst({ where: { code: "QSP-U1" } });
      assert.ok(uni, "QSP-U1 university must exist in seed");
      await prisma.university.update({
        where: { id: uni.id },
        data: { applicationFee: 1000 },
      });
    });

    const consultantCookie = await loginCookie(baseUrl, "consultant@university.local");

    let ctx: { universityId: string; streamId: string; academicYearId: string };
    await step("Consultant — GET leads-context", async () => {
      const res = await fetch(`${baseUrl}/api/consultant/leads-context`, {
        headers: { Cookie: consultantCookie },
      });
      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as {
        universityId: string;
        streams: { id: string; name: string }[];
        academicYears: { id: string; label: string }[];
      };
      assert.ok(data.streams.length > 0, "need streams");
      assert.ok(data.academicYears.length > 0, "need academic years");
      ctx = {
        universityId: data.universityId,
        streamId: data.streams[0]!.id,
        academicYearId: data.academicYears[data.academicYears.length - 1]!.id,
      };
    });

    await step("Consultant — POST create lead with full profile data", async () => {
      const res = await fetch(`${baseUrl}/api/consultant/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: consultantCookie },
        body: JSON.stringify(buildLeadPayload({ ...ctx!, email: studentEmail })),
      });
      const bodyText = await res.text();
      assert.strictEqual(res.status, 200, bodyText);
      const data = JSON.parse(bodyText) as { lead: { id: string; firstName: string } };
      leadId = data.lead.id;
      assert.strictEqual(data.lead.firstName, "E2E");
    });

    await step("Consultant — PATCH lead status to READY_TO_PAY", async () => {
      const res = await fetch(`${baseUrl}/api/consultant/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: consultantCookie },
        body: JSON.stringify({ admissionStatus: "READY_TO_PAY" }),
      });
      const bodyText = await res.text();
      assert.strictEqual(res.status, 200, bodyText);
      const data = JSON.parse(bodyText) as { lead: { admissionStatus: string } };
      assert.strictEqual(data.lead.admissionStatus, "READY_TO_PAY");
    });

    await step("DB — student user + application linked to lead", async () => {
      const lead = await prisma.admissionLead.findUnique({
        where: { id: leadId! },
        include: { application: { select: { id: true, userId: true } } },
      });
      assert.ok(lead?.application, "application should exist after READY_TO_PAY");
      applicationId = lead.application!.id;
      studentUserId = lead.application!.userId;
      const user = await prisma.user.findUnique({ where: { id: studentUserId! } });
      assert.strictEqual(user?.email, studentEmail);
    });

    const studentCookie = await loginCookie(baseUrl, studentEmail);

    await step("Student — GET application returns pre-filled profile", async () => {
      const res = await fetch(`${baseUrl}/api/student/application?applicationId=${applicationId}`, {
        headers: { Cookie: studentCookie },
      });
      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as {
        application: {
          id: string;
          profile: {
            fullName: string;
            sslcSchool: string;
            qualInstitution: string;
            guardianName: string;
            uidaiNumber: string;
            programType: string;
            degreeType: string;
            entranceExams: { examName: string }[];
            photoUrl: string | null;
          };
          profileComplete: boolean;
          paymentSummary: { panelState: string };
        };
      };
      const p = data.application.profile;
      assert.strictEqual(p.fullName, "E2E Prefill");
      assert.strictEqual(p.sslcSchool, "E2E High School");
      assert.strictEqual(p.qualInstitution, "E2E PU College");
      assert.strictEqual(p.guardianName, "E2E Parent");
      assert.strictEqual(p.uidaiNumber, "123456789012");
      assert.strictEqual(p.programType, "UG");
      assert.strictEqual(p.degreeType, "Bachelor of Technology");
      assert.strictEqual(p.entranceExams.length, 1);
      assert.strictEqual(p.entranceExams[0]!.examName, "KCET");
      assert.strictEqual(p.photoUrl, null);
      assert.strictEqual(data.application.profileComplete, false);
      assert.strictEqual(data.application.paymentSummary.panelState, "ready_to_pay");
    });

    await step("Student — profile page loads with pre-filled content", async () => {
      const res = await fetch(`${baseUrl}/dashboard/student/profile`, {
        headers: { Cookie: studentCookie },
      });
      assert.strictEqual(res.status, 200);
      const html = await res.text();
      assert.ok(html.includes("Profile"), "profile page heading");
      assert.ok(html.includes("My Application") || html.includes("consultant"), "profile page context");
    });

    await step("Student — application page loads profile step", async () => {
      const res = await fetch(`${baseUrl}/dashboard/student/application`, {
        headers: { Cookie: studentCookie },
      });
      assert.strictEqual(res.status, 200);
      const html = await res.text();
      assert.ok(html.includes("My Application"), "application page");
    });

    await step("Student — submit profile without photo is rejected", async () => {
      const appRes = await fetch(`${baseUrl}/api/student/application?applicationId=${applicationId}`, {
        headers: { Cookie: studentCookie },
      });
      const appData = (await appRes.json()) as { application: { profile: Record<string, unknown> } };
      const res = await fetch(`${baseUrl}/api/student/application`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: studentCookie },
        body: JSON.stringify({
          applicationId,
          submitProfile: true,
          ...appData.application.profile,
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = (await res.json()) as { fieldErrors?: Record<string, string> };
      assert.ok(data.fieldErrors?.photoUrl, "photoUrl error expected");
    });

    await step("Student — payment blocked until profile complete", async () => {
      const res = await fetch(`${baseUrl}/api/student/application/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: studentCookie },
        body: JSON.stringify({ applicationId, method: "upi", amountRupees: 500 }),
      });
      assert.strictEqual(res.status, 409);
      const data = (await res.json()) as { error?: string };
      assert.ok(data.error?.includes("profile"), data.error);
    });

    await step("Student — upload passport photo", async () => {
      const form = new FormData();
      form.set("applicationId", applicationId!);
      form.set("photoFile", makePngFile());
      const res = await fetch(`${baseUrl}/api/student/application/photo`, {
        method: "POST",
        headers: { Cookie: studentCookie },
        body: form,
      });
      const bodyText = await res.text();
      assert.strictEqual(res.status, 200, bodyText);
      const data = JSON.parse(bodyText) as { photoUrl?: string };
      assert.ok(data.photoUrl, "photoUrl returned");
    });

    await step("Student — submit profile succeeds", async () => {
      const appRes = await fetch(`${baseUrl}/api/student/application?applicationId=${applicationId}`, {
        headers: { Cookie: studentCookie },
      });
      const appData = (await appRes.json()) as {
        application: { profile: Record<string, unknown>; profileComplete: boolean };
      };
      assert.strictEqual(appData.application.profileComplete, true);
      const res = await fetch(`${baseUrl}/api/student/application`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: studentCookie },
        body: JSON.stringify({
          applicationId,
          submitProfile: true,
          ...appData.application.profile,
        }),
      });
      assert.strictEqual(res.status, 200, await res.text());
    });

    await step("Student — simulated payment succeeds", async () => {
      const res = await fetch(`${baseUrl}/api/student/application/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: studentCookie },
        body: JSON.stringify({ applicationId, method: "upi", amountRupees: 500 }),
      });
      const bodyText = await res.text();
      assert.strictEqual(res.status, 200, bodyText);
      const data = JSON.parse(bodyText) as { ok?: boolean };
      assert.strictEqual(data.ok, true);
    });

    await step("Consultant — lead appears in student leads list", async () => {
      const res = await fetch(`${baseUrl}/api/consultant/leads?scope=all&q=${encodeURIComponent(studentEmail)}`, {
        headers: { Cookie: consultantCookie },
      });
      assert.strictEqual(res.status, 200);
      const data = (await res.json()) as { leads?: { email?: string }[] };
      assert.ok(data.leads?.some((l) => l.email === studentEmail), "lead in consultant list");
    });
  } finally {
    if (leadId) {
      await prisma.leadEntranceExam.deleteMany({ where: { leadId } });
      await prisma.leadPayment.deleteMany({ where: { leadId } });
      await prisma.admissionLeadStatusHistory.deleteMany({ where: { leadId } });
      if (applicationId) {
        await prisma.application.deleteMany({ where: { id: applicationId } });
      }
      await prisma.admissionLead.deleteMany({ where: { id: leadId } });
    }
    if (studentUserId) {
      await prisma.userRole.deleteMany({ where: { userId: studentUserId } });
      await prisma.user.deleteMany({ where: { id: studentUserId } });
    }
    await prisma.$disconnect();
  }

  return { passed, failed };
}
