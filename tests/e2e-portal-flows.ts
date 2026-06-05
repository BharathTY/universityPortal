/**
 * HTTP E2E — authenticated portal pages and consultant APIs.
 * Requires dev server at E2E_BASE_URL (default http://localhost:7777) and seeded DB.
 */
import assert from "node:assert";

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

function assertIncludes(haystack: string, needle: string, label: string) {
  assert.ok(
    haystack.includes(needle),
    `${label}: expected to include "${needle}" in:\n${haystack.slice(0, 400)}`,
  );
}

async function loginCookie(baseUrl: string, email: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  assert.strictEqual(res.status, 200, `login failed for ${email}`);
  const cookie = res.headers.get("set-cookie") ?? "";
  const sessionCookie = cookie.split(";")[0] ?? "";
  assert.ok(sessionCookie.includes("UP_SESSION"), `missing session cookie for ${email}`);
  return sessionCookie;
}

export async function runPortalFlowE2e(baseUrl: string): Promise<{ passed: number; failed: number }> {
  console.log(`\nPortal flows (${baseUrl})`);
  let passed = 0;
  let failed = 0;

  async function http(name: string, fn: () => Promise<void>) {
    const ok = await test(name, fn);
    if (ok) passed++;
    else failed++;
  }

  const consultantCookie = await loginCookie(baseUrl, "consultant@university.local");
  const masterCookie = await loginCookie(baseUrl, "master@university.local");
  const spocCookie = await loginCookie(baseUrl, "counsellor@university.local");
  const universityCookie = await loginCookie(baseUrl, "university@university.local");

  await http("Consultant — home dashboard", async () => {
    const res = await fetch(`${baseUrl}/dashboard/consultant-home`, {
      headers: { Cookie: consultantCookie },
    });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assertIncludes(html, "Assigned Universities", "consultant home");
  });

  await http("Consultant — student leads page", async () => {
    const res = await fetch(`${baseUrl}/dashboard/consultant/leads`, {
      headers: { Cookie: consultantCookie },
    });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assertIncludes(html, "Student Leads", "leads heading");
  });

  await http("Consultant — add lead page", async () => {
    const res = await fetch(`${baseUrl}/dashboard/consultant/leads/new`, {
      headers: { Cookie: consultantCookie },
    });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assertIncludes(html, "Add lead", "add lead form");
    assertIncludes(html, "Academic year", "academic year field");
  });

  await http("Consultant — assigned universities page", async () => {
    const res = await fetch(`${baseUrl}/dashboard/consultant/assigned-universities`, {
      headers: { Cookie: consultantCookie },
    });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assertIncludes(html, "Assigned Universities", "assigned universities heading");
  });

  await http("Consultant — SPOCs page", async () => {
    const res = await fetch(`${baseUrl}/dashboard/consultant/spocs`, {
      headers: { Cookie: consultantCookie },
    });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assertIncludes(html, "Consultant SPOCs", "spocs heading");
  });

  await http("Consultant — GET /api/consultant/leads?scope=all", async () => {
    const res = await fetch(`${baseUrl}/api/consultant/leads?scope=all`, {
      headers: { Cookie: consultantCookie },
    });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as { leads?: unknown[]; summary?: unknown };
    assert.ok(Array.isArray(data.leads), "leads array");
    assert.ok(data.summary && typeof data.summary === "object", "summary object");
  });

  await http("Consultant — GET /api/auth/consultant-universities", async () => {
    const res = await fetch(`${baseUrl}/api/auth/consultant-universities`, {
      headers: { Cookie: consultantCookie },
    });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as { universities?: unknown[] };
    assert.ok(Array.isArray(data.universities), "universities array");
    assert.ok((data.universities?.length ?? 0) > 0, "at least one university");
  });

  await http("Consultant — lead status PATCH (status-only)", async () => {
    const listRes = await fetch(`${baseUrl}/api/consultant/leads?scope=all`, {
      headers: { Cookie: consultantCookie },
    });
    const list = (await listRes.json()) as { leads?: { id: string; statusRaw?: string }[] };
    const lead = list.leads?.[0];
    assert.ok(lead?.id, "need at least one lead in seed data");

    const patchRes = await fetch(`${baseUrl}/api/consultant/leads/${lead!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: consultantCookie },
      body: JSON.stringify({ admissionStatus: lead!.statusRaw ?? "NEW_LEAD" }),
    });
    assert.strictEqual(patchRes.status, 200);
  });

  await http("Consultant SPOC — dashboard", async () => {
    const res = await fetch(`${baseUrl}/dashboard/spoc`, {
      headers: { Cookie: spocCookie },
    });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assertIncludes(html, "SPOC", "spoc dashboard");
  });

  await http("Master — consultants list", async () => {
    const res = await fetch(`${baseUrl}/dashboard/master/consultants`, {
      headers: { Cookie: masterCookie },
    });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assertIncludes(html, "Consultant", "consultants list");
  });

  await http("Master — payments page", async () => {
    const res = await fetch(`${baseUrl}/dashboard/master/payments`, {
      headers: { Cookie: masterCookie },
    });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assertIncludes(html, "Payment", "payments page");
  });

  await http("Master — add university wizard", async () => {
    const res = await fetch(`${baseUrl}/dashboard/master/universities/new`, {
      headers: { Cookie: masterCookie },
    });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assertIncludes(html, "university", "add university wizard");
  });

  await http("University staff — admissions page", async () => {
    const uniRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: universityCookie },
    });
    const meRes = (await uniRes.json()) as { user?: { universityId?: string | null } };
    const universityId = meRes.user?.universityId;
    assert.ok(universityId, "university staff needs universityId");

    const res = await fetch(`${baseUrl}/dashboard/university/${universityId}/admissions`, {
      headers: { Cookie: universityCookie },
    });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assertIncludes(html, "Admission", "admissions page");
  });

  await http("Student — application page", async () => {
    const studentCookie = await loginCookie(baseUrl, "student@university.local");
    const res = await fetch(`${baseUrl}/dashboard/student/application`, {
      headers: { Cookie: studentCookie },
    });
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assertIncludes(html, "Application", "student application");
  });

  return { passed, failed };
}
