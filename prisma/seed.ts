import { ApplicationStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const roleDefs = [
    { slug: "student", name: "Student" },
    { slug: "consultant", name: "Consultant" },
    { slug: "university", name: "University" },
    { slug: "master", name: "Master" },
    { slug: "admin", name: "Admin" },
    { slug: "counsellor", name: "Counsellor" },
    { slug: "consultant_master", name: "Consultant Master" },
  ];

  for (const r of roleDefs) {
    await prisma.role.upsert({
      where: { slug: r.slug },
      create: r,
      update: { name: r.name },
    });
  }

  const role = (slug: string) => prisma.role.findUniqueOrThrow({ where: { slug } });

  const uni1 = await prisma.university.upsert({
    where: { code: "QSP-U1" },
    create: {
      name: "QSP University",
      code: "QSP-U1",
      email: "admissions@qsp-university.local",
      phone: "+91-0000000001",
      status: "ACTIVE",
    },
    update: {
      name: "QSP University",
      email: "admissions@qsp-university.local",
      phone: "+91-0000000001",
      status: "ACTIVE",
    },
  });

  const uni2 = await prisma.university.upsert({
    where: { code: "JAIN-OL" },
    create: {
      name: "JAIN Online",
      code: "JAIN-OL",
      email: "contact@jainonline.local",
      phone: "+91-0000000002",
      status: "ACTIVE",
    },
    update: {
      email: "contact@jainonline.local",
      phone: "+91-0000000002",
      status: "ACTIVE",
    },
  });

  const masterUser = await prisma.user.upsert({
    where: { email: "master@university.local" },
    create: {
      email: "master@university.local",
      name: "Master Admin",
      phone: "+91-0000000100",
      universityId: null,
      studentOfId: null,
      accountStatus: "ACTIVE",
    },
    update: {
      name: "Master Admin",
      phone: "+91-0000000100",
      universityId: null,
      studentOfId: null,
      accountStatus: "ACTIVE",
    },
  });
  await prisma.userRole.deleteMany({ where: { userId: masterUser.id } });
  await prisma.userRole.create({
    data: { userId: masterUser.id, roleId: (await role("master")).id },
  });

  const uniAdmin = await prisma.user.upsert({
    where: { email: "university@university.local" },
    create: {
      email: "university@university.local",
      name: "QSP Admissions",
      phone: "+91-0000000001",
      universityId: uni1.id,
      studentOfId: null,
      accountStatus: "ACTIVE",
    },
    update: {
      name: "QSP Admissions",
      phone: "+91-0000000001",
      universityId: uni1.id,
      accountStatus: "ACTIVE",
    },
  });
  await prisma.userRole.deleteMany({ where: { userId: uniAdmin.id } });
  await prisma.userRole.create({
    data: { userId: uniAdmin.id, roleId: (await role("university")).id },
  });

  const consultantUser = await prisma.user.upsert({
    where: { email: "consultant@university.local" },
    create: {
      email: "consultant@university.local",
      name: "Demo Consultant",
      phone: "+91-0000000003",
      universityId: uni1.id,
      studentOfId: null,
      accountStatus: "ACTIVE",
    },
    update: {
      name: "Demo Consultant",
      phone: "+91-0000000003",
      universityId: uni1.id,
      accountStatus: "ACTIVE",
    },
  });
  await prisma.userRole.deleteMany({ where: { userId: consultantUser.id } });
  await prisma.userRole.create({
    data: { userId: consultantUser.id, roleId: (await role("consultant")).id },
  });

  const counsellorUser = await prisma.user.upsert({
    where: { email: "counsellor@university.local" },
    create: {
      email: "counsellor@university.local",
      name: "Demo Counsellor",
      phone: "+91-0000000004",
      universityId: uni1.id,
      studentOfId: null,
      accountStatus: "ACTIVE",
    },
    update: {
      name: "Demo Counsellor",
      phone: "+91-0000000004",
      universityId: uni1.id,
      accountStatus: "ACTIVE",
    },
  });
  await prisma.userRole.deleteMany({ where: { userId: counsellorUser.id } });
  await prisma.userRole.create({
    data: { userId: counsellorUser.id, roleId: (await role("counsellor")).id },
  });

  /** Students linked to counsellor vs consultant (university QSP-U1). */
  const studentSeeds: {
    email: string;
    name: string;
    managedBy: "counsellor" | "consultant";
  }[] = [
    { email: "student@university.local", name: "Demo Student", managedBy: "counsellor" },
    { email: "student2@university.local", name: "Applicant Two", managedBy: "counsellor" },
    { email: "student3@university.local", name: "Applicant Three", managedBy: "counsellor" },
    { email: "student4@university.local", name: "Applicant Four", managedBy: "consultant" },
    { email: "student5@university.local", name: "Applicant Five", managedBy: "consultant" },
    { email: "student6@university.local", name: "Applicant Six", managedBy: "consultant" },
  ];

  const students: { id: string }[] = [];
  for (const s of studentSeeds) {
    const mentorId = s.managedBy === "counsellor" ? counsellorUser.id : consultantUser.id;
    const u = await prisma.user.upsert({
      where: { email: s.email },
      create: {
        email: s.email,
        name: s.name,
        universityId: uni1.id,
        studentOfId: mentorId,
        inviteToken: null,
        inviteAcceptedAt: new Date(),
      },
      update: {
        name: s.name,
        universityId: uni1.id,
        studentOfId: mentorId,
      },
    });
    await prisma.userRole.deleteMany({ where: { userId: u.id } });
    await prisma.userRole.create({
      data: { userId: u.id, roleId: (await role("student")).id },
    });
    students.push(u);
  }

  await prisma.admissionLead.deleteMany({});
  await prisma.academicYear.deleteMany({});
  await prisma.stream.deleteMany({});

  const year2024 = await prisma.academicYear.create({
    data: { universityId: uni1.id, label: "2024", sortOrder: 0 },
  });
  const year2025 = await prisma.academicYear.create({
    data: { universityId: uni1.id, label: "2025", sortOrder: 1 },
  });
  const year2026 = await prisma.academicYear.create({
    data: { universityId: uni1.id, label: "2026", sortOrder: 2 },
  });

  const streamBtech = await prisma.stream.create({
    data: { universityId: uni1.id, name: "B.Tech", sortOrder: 0 },
  });
  const streamBca = await prisma.stream.create({
    data: { universityId: uni1.id, name: "BCA", sortOrder: 1 },
  });
  const streamMca = await prisma.stream.create({
    data: { universityId: uni1.id, name: "MCA", sortOrder: 2 },
  });
  const streamMba = await prisma.stream.create({
    data: { universityId: uni1.id, name: "MBA", sortOrder: 3 },
  });
  const streamMtech = await prisma.stream.create({
    data: { universityId: uni1.id, name: "M.Tech", sortOrder: 4 },
  });

  await prisma.admissionLead.create({
    data: {
      universityId: uni1.id,
      academicYearId: year2026.id,
      streamId: streamBtech.id,
      firstName: "Demo",
      lastName: "Lead",
      email: "demo.lead@example.com",
      mobile: "+919999000001",
      consultantCode: "CONS-DEMO",
      consultantRoleId: (await role("consultant")).id,
      admissionStatus: "NEW",
      nationality: "India",
      specialization: "CSE",
    },
  });

  await prisma.admissionLead.create({
    data: {
      universityId: uni1.id,
      academicYearId: year2026.id,
      streamId: streamMba.id,
      firstName: "Counsellor",
      lastName: "Pipeline Lead",
      email: "counsellor.pipeline@example.com",
      mobile: "+919999000002",
      consultantCode: "COUNS-DEMO",
      consultantRoleId: (await role("counsellor")).id,
      admissionStatus: "CONTACTED",
      nationality: "India",
      specialization: "MBA",
      createdByUserId: counsellorUser.id,
    },
  });

  await prisma.batch.deleteMany({});
  const batchJan = await prisma.batch.create({
    data: {
      title: "January 2026",
      code: "Jan-26",
      batchStartDate: new Date("2025-11-20T00:00:00.000Z"),
      admissionEndDate: new Date("2026-04-10T00:00:00.000Z"),
      ownerId: consultantUser.id,
    },
  });
  await prisma.batch.create({
    data: {
      title: "January 2028",
      code: "Jan-28",
      batchStartDate: new Date("2027-11-01T00:00:00.000Z"),
      admissionEndDate: new Date("2028-04-15T00:00:00.000Z"),
      ownerId: consultantUser.id,
    },
  });

  await prisma.application.deleteMany({});
  await prisma.application.createMany({
    data: [
      {
        userId: students[0]!.id,
        universityId: uni1.id,
        batchId: batchJan.id,
        status: ApplicationStatus.PROGRAM_FEE_PENDING,
      },
      {
        userId: students[1]!.id,
        universityId: uni1.id,
        batchId: batchJan.id,
        status: ApplicationStatus.REGISTRATION_FEE_PENDING,
      },
      {
        userId: students[2]!.id,
        universityId: uni1.id,
        batchId: batchJan.id,
        status: ApplicationStatus.REGISTRATION_FEE_PENDING,
      },
      {
        userId: students[3]!.id,
        universityId: uni1.id,
        batchId: batchJan.id,
        status: ApplicationStatus.PROGRAM_FEE_PENDING,
      },
      {
        userId: students[4]!.id,
        universityId: uni1.id,
        batchId: batchJan.id,
        status: ApplicationStatus.PROGRAM_FEE_PENDING,
      },
      {
        userId: students[5]!.id,
        universityId: uni1.id,
        batchId: batchJan.id,
        status: ApplicationStatus.COMPLETED,
      },
    ],
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@university.local" },
    create: {
      email: "admin@university.local",
      name: "Campus Admin",
      phone: "+91-0000000005",
      universityId: uni1.id,
      studentOfId: null,
      accountStatus: "ACTIVE",
    },
    update: {
      name: "Campus Admin",
      phone: "+91-0000000005",
      universityId: uni1.id,
      accountStatus: "ACTIVE",
    },
  });
  await prisma.userRole.deleteMany({ where: { userId: adminUser.id } });
  await prisma.userRole.create({
    data: { userId: adminUser.id, roleId: (await role("admin")).id },
  });

  console.log("\n=== Seed OK ===");
  console.log("Universities:", uni1.code, "(" + uni1.name + ")", "|", uni2.code, "(" + uni2.name + ")");
  console.log(
    "Links: students student@…student3@ → counsellor; student4@…student6@ → consultant (same university).",
  );
  console.log("\n--- Demo logins (passwordless — use OTP emailed / dev console / on-screen in dev) ---");
  console.log("Master Admin     : master@university.local");
  console.log("Admin            : admin@university.local");
  console.log("University staff : university@university.local");
  console.log("Counsellor       : counsellor@university.local");
  console.log("Consultant       : consultant@university.local");
  console.log("Student (couns.) : student@university.local, student2@, student3@");
  console.log("Student (cons.) : student4@, student5@, student6@university.local");
  console.log("See docs/DEMO_LOGINS.md for details.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
