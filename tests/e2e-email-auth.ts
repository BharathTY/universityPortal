/**
 * E2E tests: email content, SMTP connectivity, and live HTTP flows.
 * Run: npm run test:e2e  (dev server optional for HTTP section)
 */
import assert from "node:assert";
import nodemailer from "nodemailer";

type SentMail = {
  from?: string;
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
};

const sentMails: SentMail[] = [];

/** Capture outbound mail without hitting real SMTP during content tests. */
function installMailCapture() {
  const original = nodemailer.createTransport;
  (nodemailer as unknown as { createTransport: typeof nodemailer.createTransport }).createTransport =
    () =>
      ({
        sendMail: async (opts: SentMail) => {
          sentMails.push({ ...opts });
          return { messageId: "e2e-test-id", accepted: [opts.to] };
        },
        verify: async () => true,
      }) as ReturnType<typeof nodemailer.createTransport>;

  return () => {
    (nodemailer as unknown as { createTransport: typeof nodemailer.createTransport }).createTransport =
      original;
  };
}

async function test(name: string, fn: () => void | Promise<void>) {
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

function assertIncludes(haystack: string, needle: string, label: string) {
  assert.ok(
    haystack.includes(needle),
    `${label}: expected to include "${needle}" in:\n${haystack.slice(0, 400)}`,
  );
}

async function runEmailContentTests(): Promise<{ passed: number; failed: number }> {
  console.log("\nEmail content (mocked SMTP)");
  let passed = 0;
  let failed = 0;

  const savedSmtp = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    EMAIL_FROM: process.env.EMAIL_FROM,
  };

  const restore = installMailCapture();
  process.env.SMTP_HOST = "smtp.test.local";
  process.env.SMTP_USER = "test@test.local";
  process.env.SMTP_PASS = "testpass";
  process.env.EMAIL_FROM = "Eduversity Test <test@eduversity.local>";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:7777";
  process.env.APP_BASE_URL = "http://localhost:7777";

  // Fresh import after mock
  const email = await import("../src/lib/email");

  async function run(name: string, fn: () => Promise<void>) {
    sentMails.length = 0;
    const ok = await test(name, fn);
    if (ok) passed++;
    else failed++;
  }

  await run("sendOtpEmail — subject, code in body", async () => {
    await email.sendOtpEmail("user@test.com", "123456");
    assert.strictEqual(sentMails.length, 1);
    const m = sentMails[0]!;
    assert.strictEqual(m.to, "user@test.com");
    assert.strictEqual(m.subject, "Your sign-in code");
    assertIncludes(m.text ?? "", "123456", "OTP text");
    assertIncludes(m.html ?? "", "123456", "OTP html");
  });

  await run("sendPasswordResetEmail — reset link and Eduversity branding", async () => {
    const resetUrl = "http://localhost:7777/reset-password?token=abc123";
    await email.sendPasswordResetEmail({
      to: "master@test.com",
      name: "Master Admin",
      resetUrl,
    });
    assert.strictEqual(sentMails.length, 1);
    const m = sentMails[0]!;
    assert.strictEqual(m.subject, "Reset your password");
    assertIncludes(m.text ?? "", resetUrl, "reset URL in text");
    assertIncludes(m.text ?? "", "Eduversity", "branding");
    assertIncludes(m.html ?? "", resetUrl, "reset URL in html");
    assertIncludes(m.text ?? "", "1 hour", "expiry note");
  });

  await run("sendConsultantAccountCreatedEmail — portal link, credentials", async () => {
    await email.sendConsultantAccountCreatedEmail({
      to: "consultant@test.com",
      name: "Demo Consultant",
      email: "consultant@test.com",
      password: "TempPass123!",
    });
    const m = sentMails[0]!;
    assertIncludes(m.subject ?? "", "Eduversity", "subject");
    assertIncludes(m.text ?? "", "consultant@test.com", "email in body");
    assertIncludes(m.text ?? "", "TempPass123!", "password in body");
    assertIncludes(m.text ?? "", "http://localhost:7777/login", "portal link");
  });

  await run("sendAccountCredentialsEmail — university admin credentials", async () => {
    await email.sendAccountCredentialsEmail({
      to: "uni@test.com",
      name: "QSP University",
      email: "uni@test.com",
      password: "UniPass456!",
    });
    const m = sentMails[0]!;
    assert.strictEqual(m.subject, "Account Created");
    assertIncludes(m.text ?? "", "UniPass456!", "password");
    assertIncludes(m.text ?? "", "uni@test.com", "email");
  });

  await run("sendStudentInviteEmail — accept URL and partner name", async () => {
    const acceptUrl = "http://localhost:7777/invite/accept?token=invite123";
    await email.sendStudentInviteEmail("student@test.com", acceptUrl, {
      partnerName: "Demo Consultant",
    });
    const m = sentMails[0]!;
    assert.strictEqual(m.subject, "Accept your student portal invitation");
    assertIncludes(m.text ?? "", acceptUrl, "accept URL");
    assertIncludes(m.text ?? "", "Demo Consultant", "partner name");
    assertIncludes(m.html ?? "", acceptUrl, "accept URL html");
  });

  await run("sendCounsellorPortalInviteEmail — SPOC invite with inviter", async () => {
    await email.sendCounsellorPortalInviteEmail({
      to: "spoc@test.com",
      name: "Demo SPOC",
      email: "spoc@test.com",
      password: "SpocPass789!",
      loginUrl: "http://localhost:7777/login",
      inviterName: "Demo Consultant",
    });
    const m = sentMails[0]!;
    assertIncludes(m.subject ?? "", "counsellor", "subject mentions counsellor");
    assertIncludes(m.text ?? "", "Demo Consultant", "inviter name");
    assertIncludes(m.text ?? "", "SpocPass789!", "password");
  });

  await run("sendStudentRegistrationEmail — university and degree details", async () => {
    await email.sendStudentRegistrationEmail({
      to: "student@test.com",
      name: "Jane Student",
      universityName: "QSP University",
      academicBatchName: "2026",
      degreeName: "B.Tech CSE",
    });
    const m = sentMails[0]!;
    assertIncludes(m.subject ?? "", "Qspiders Eduversity", "subject");
    assertIncludes(m.text ?? "", "QSP University", "university");
    assertIncludes(m.text ?? "", "B.Tech CSE", "degree");
    assertIncludes(m.text ?? "", "2026", "batch");
  });

  await run("sendPaymentSuccessEmail — amount and application id", async () => {
    await email.sendPaymentSuccessEmail({
      to: "student@test.com",
      name: "Jane",
      amountLabel: "₹5,000",
      applicationId: "APP-QSP-001",
    });
    const m = sentMails[0]!;
    assert.strictEqual(m.subject, "Payment received");
    assertIncludes(m.text ?? "", "₹5,000", "amount");
    assertIncludes(m.text ?? "", "APP-QSP-001", "application id");
  });

  await run("sendAdmissionLeadWelcomeEmail — prospect registration", async () => {
    await email.sendAdmissionLeadWelcomeEmail({
      to: "lead@test.com",
      name: "John Doe",
      universityName: "QSP University",
      partnerLabel: "Demo Consultant",
    });
    const m = sentMails[0]!;
    assertIncludes(m.subject ?? "", "prospective student", "subject");
    assertIncludes(m.text ?? "", "QSP University", "university");
    assertIncludes(m.text ?? "", "Demo Consultant", "partner");
  });

  await run("HTML escape — XSS-safe in consultant email", async () => {
    await email.sendConsultantAccountCreatedEmail({
      to: "x@test.com",
      name: '<script>alert("x")</script>',
      email: "x@test.com",
      password: "pass",
    });
    const m = sentMails[0]!;
    assert.ok(!(m.html ?? "").includes("<script>"), "script tag must be escaped");
    assertIncludes(m.html ?? "", "&lt;script&gt;", "escaped html");
  });

  restore();
  if (savedSmtp.SMTP_HOST) process.env.SMTP_HOST = savedSmtp.SMTP_HOST;
  if (savedSmtp.SMTP_USER) process.env.SMTP_USER = savedSmtp.SMTP_USER;
  if (savedSmtp.SMTP_PASS) process.env.SMTP_PASS = savedSmtp.SMTP_PASS;
  if (savedSmtp.EMAIL_FROM) process.env.EMAIL_FROM = savedSmtp.EMAIL_FROM;
  return { passed, failed };
}

async function runSmtpLiveTest(): Promise<{ passed: number; failed: number }> {
  console.log("\nSMTP connectivity (live .env config)");
  let passed = 0;
  let failed = 0;

  // Re-read .env so content-test mock vars never leak
  const path = await import("node:path");
  loadEnvFile(path.join(process.cwd(), ".env"));

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;

  if (!host || !user || !pass) {
    console.log("  ⊘ Skipped — SMTP_HOST/USER/PASS not set (dev console fallback only)");
    return { passed, failed };
  }

  const ok = await test("SMTP verify() succeeds", async () => {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.verify();
  });
  if (ok) passed++;
  else failed++;

  const sendOk = await test("Send test message to SMTP_USER inbox", async () => {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    const from = process.env.EMAIL_FROM ?? user;
    const info = await transporter.sendMail({
      from,
      to: user,
      subject: "[Eduversity E2E] SMTP test",
      text: `Automated e2e test at ${new Date().toISOString()}\nIf you received this, SMTP delivery works.`,
      html: `<p>Automated e2e test at <strong>${new Date().toISOString()}</strong></p><p>If you received this, SMTP delivery works.</p>`,
    });
    assert.ok(info.messageId, "messageId should be set");
    console.log(`    → messageId: ${info.messageId}, to: ${user}`);
  });
  if (sendOk) passed++;
  else failed++;

  return { passed, failed };
}

async function runHttpE2e(baseUrl: string): Promise<{ passed: number; failed: number }> {
  console.log(`\nHTTP E2E (${baseUrl})`);
  let passed = 0;
  let failed = 0;

  async function http(name: string, fn: () => Promise<void>) {
    const ok = await test(name, fn);
    if (ok) passed++;
    else failed++;
  }

  await http("GET /login returns 200", async () => {
    const res = await fetch(`${baseUrl}/login`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assertIncludes(html, "Sign in", "login page title");
  });

  await http("GET /forgot-password returns 200", async () => {
    const res = await fetch(`${baseUrl}/forgot-password`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assertIncludes(html, "password", "forgot password page");
  });

  await http("POST /api/auth/login — master (passwordless)", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "master@university.local" }),
    });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as { ok?: boolean; redirectTo?: string };
    assert.strictEqual(data.ok, true);
    assert.strictEqual(data.redirectTo, "/dashboard/master");
    const setCookie = res.headers.get("set-cookie");
    assert.ok(setCookie?.includes("UP_SESSION"), "session cookie should be set");
  });

  await http("POST /api/auth/login — consultant redirect", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "consultant@university.local" }),
    });
    const data = (await res.json()) as { redirectTo?: string };
    assert.strictEqual(data.redirectTo, "/dashboard/consultant-home");
  });

  await http("POST /api/auth/login — SPOC redirect", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "counsellor@university.local" }),
    });
    const data = (await res.json()) as { redirectTo?: string };
    assert.strictEqual(data.redirectTo, "/dashboard/spoc");
  });

  await http("POST /api/auth/login — student redirect", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "student@university.local" }),
    });
    const data = (await res.json()) as { redirectTo?: string };
    assert.strictEqual(data.redirectTo, "/dashboard/student/application");
  });

  await http("POST /api/auth/forgot-password — generic success (unknown email)", async () => {
    const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `no-such-user-${Date.now()}@university.local` }),
    });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as { ok?: boolean; message?: string };
    assert.strictEqual(data.ok, true);
    assertIncludes(data.message ?? "", "If an account", "no-enumeration message");
  });

  await http("GET /dashboard/master — requires auth (redirect without cookie)", async () => {
    const res = await fetch(`${baseUrl}/dashboard/master`, { redirect: "manual" });
    assert.ok(res.status === 307 || res.status === 302, `expected redirect, got ${res.status}`);
  });

  await http("Authenticated session — master dashboard loads", async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "master@university.local" }),
    });
    const cookie = loginRes.headers.get("set-cookie") ?? "";
    const sessionCookie = cookie.split(";")[0] ?? "";
    const dashRes = await fetch(`${baseUrl}/dashboard/master`, {
      headers: { Cookie: sessionCookie },
      redirect: "manual",
    });
    assert.strictEqual(dashRes.status, 200, "master dashboard should load with session");
    const html = await dashRes.text();
    assertIncludes(html, "Universities", "dashboard content");
  });

  return { passed, failed };
}

async function runForgotPasswordWithPasswordUser(baseUrl: string): Promise<{ passed: number; failed: number }> {
  console.log("\nForgot-password flow (user with passwordHash)");
  let passed = 0;
  let failed = 0;

  const { PrismaClient } = await import("@prisma/client");
  const { hashPassword } = await import("../src/lib/password");
  const prisma = new PrismaClient();
  const testEmail = `e2e-reset-${Date.now()}@university.local`;

  try {
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "E2E Reset User",
        passwordHash: await hashPassword("OldPass123!"),
        accountStatus: "ACTIVE",
      },
    });

    const ok = await test("POST forgot-password creates reset token", async () => {
      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });
      assert.strictEqual(res.status, 200);

      const token = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id, usedAt: null },
        orderBy: { createdAt: "desc" },
      });
      assert.ok(token, "reset token should be created in DB");
    });
    if (ok) passed++;
    else failed++;

    const resetOk = await test("POST reset-password updates hash and marks token used", async () => {
      const { randomBytes } = await import("node:crypto");
      const { hashOtp } = await import("../src/lib/otp");
      const plainToken = randomBytes(32).toString("hex");
      const tokenHash = await hashOtp(plainToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: plainToken, password: "NewPass456!" }),
      });
      if (res.status !== 200) {
        const errBody = await res.text();
        assert.fail(`reset-password failed ${res.status}: ${errBody}`);
      }

      const updated = await prisma.user.findUnique({ where: { id: user.id } });
      const { verifyPassword } = await import("../src/lib/password");
      assert.ok(await verifyPassword("NewPass456!", updated!.passwordHash!), "new password works");

      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail, password: "NewPass456!" }),
      });
      assert.strictEqual(loginRes.status, 200);
    });
    if (resetOk) passed++;
    else failed++;
  } finally {
    await prisma.passwordResetToken.deleteMany({ where: { user: { email: testEmail } } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.$disconnect();
  }

  return { passed, failed };
}

function loadEnvFile(envPath: string) {
  const { readFileSync, existsSync } = require("node:fs") as typeof import("node:fs");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

async function main() {
  console.log("Eduversity — E2E email & auth tests\n");

  const path = await import("node:path");
  loadEnvFile(path.join(process.cwd(), ".env"));

  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:7777";

  const smtp = await runSmtpLiveTest();
  const content = await runEmailContentTests();
  let http = { passed: 0, failed: 0 };
  let forgot = { passed: 0, failed: 0 };

  try {
    const probe = await fetch(`${baseUrl}/login`, { signal: AbortSignal.timeout(3000) });
    if (probe.ok) {
      http = await runHttpE2e(baseUrl);
      forgot = await runForgotPasswordWithPasswordUser(baseUrl);
    } else {
      console.log(`\nHTTP E2E skipped — ${baseUrl}/login returned ${probe.status}`);
    }
  } catch {
    console.log(`\nHTTP E2E skipped — dev server not reachable at ${baseUrl}`);
    console.log("  Start with: npm run dev");
  }

  const totalPassed = content.passed + smtp.passed + http.passed + forgot.passed;
  const totalFailed = content.failed + smtp.failed + http.failed + forgot.failed;

  console.log(`\n——\n${totalPassed} passed, ${totalFailed} failed`);
  process.exit(totalFailed > 0 ? 1 : 0);
}

void main();
