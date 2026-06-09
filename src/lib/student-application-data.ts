import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  decimalToNumber,
  minHostelFeeRupees,
  remainingApplicationDueRupees,
  resolveApplicationFeeRupees,
  studentPaymentPanelState,
  sumSuccessfulPaymentsRupees,
} from "@/lib/student-portal";

const applicationInclude = {
  university: {
    select: {
      id: true,
      name: true,
      code: true,
      logoUrl: true,
      address: true,
      city: true,
      state: true,
      district: true,
      pincode: true,
      applicationFee: true,
      registrationFee: true,
      hostelFees: { select: { amount: true } },
    },
  },
  user: {
    select: {
      name: true,
      email: true,
      phone: true,
      phoneAlternate: true,
      gender: true,
      dateOfBirth: true,
      whatsappNumber: true,
      pincode: true,
      districtStudent: true,
      stateStudent: true,
      ieltsScore: true,
      toeflScore: true,
      passportNumber: true,
      passportExpiry: true,
      sslcSchool: true,
      sslcBoard: true,
      sslcPercent: true,
      pucType: true,
      pucInstitution: true,
      pucYear: true,
      pucPercent: true,
      degreeName: true,
      degreeStream: true,
      degreeCollege: true,
      degreeUniversity: true,
      degreePercent: true,
    },
  },
  lead: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      mobile: true,
      nationality: true,
      specialization: true,
      admissionState: true,
      admissionStatus: true,
      programInterest: true,
      address: true,
      district: true,
      state: true,
      pincode: true,
      sslcBoard: true,
      sslcYear: true,
      sslcPercent: true,
      pucBoard: true,
      pucYear: true,
      pucPercent: true,
      degreeName: true,
      degreeStream: true,
      degreeCollege: true,
      degreeUniversity: true,
      degreePercent: true,
      stream: {
        select: {
          name: true,
          durationYears: true,
          intakeMonth: true,
          programLevel: true,
          applicationFee: true,
          tuitionYear1: true,
          collegeFee: true,
          streamFee: true,
        },
      },
      academicYear: { select: { label: true } },
      payments: {
        orderBy: { createdAt: "desc" as const },
        select: {
          id: true,
          amount: true,
          status: true,
          transactionRef: true,
          paymentMethod: true,
          collectedBy: true,
          createdAt: true,
        },
      },
    },
  },
} satisfies Prisma.ApplicationInclude;

type ApplicationRow = Prisma.ApplicationGetPayload<{ include: typeof applicationInclude }>;

function serializeApplication(row: ApplicationRow) {
  const stream = row.lead?.stream ?? null;
  const university = row.university;
  const applicationFee = resolveApplicationFeeRupees(stream, university);
  const payments = row.lead?.payments ?? [];
  const paidRupees = sumSuccessfulPaymentsRupees(payments);
  const remainingDue = remainingApplicationDueRupees(applicationFee, paidRupees);
  const leadStatus = row.lead?.admissionStatus ?? null;
  const hostelFrom = minHostelFeeRupees(university?.hostelFees ?? []);

  return {
    id: row.id,
    referenceCode: row.referenceCode,
    status: row.status,
    paymentStatus: row.paymentStatus,
    admissionReview: row.admissionReview,
    university: university
      ? {
          id: university.id,
          name: university.name,
          code: university.code,
          logoUrl: university.logoUrl,
          address: university.address,
          city: university.city,
          state: university.state,
          district: university.district,
          pincode: university.pincode,
        }
      : null,
    programme: stream
      ? {
          name: stream.name,
          durationYears: stream.durationYears,
          intakeMonth: stream.intakeMonth,
          programLevel: stream.programLevel,
          academicYear: row.lead?.academicYear.label ?? null,
          specialization: row.lead?.specialization ?? null,
        }
      : null,
    feesSnapshot: {
      applicationFee,
      tuitionYear1: decimalToNumber(stream?.tuitionYear1),
      collegeFee: decimalToNumber(stream?.collegeFee),
      hostelFrom,
    },
    lead: row.lead
      ? {
          id: row.lead.id,
          firstName: row.lead.firstName,
          lastName: row.lead.lastName,
          email: row.lead.email,
          mobile: row.lead.mobile,
          nationality: row.lead.nationality,
          specialization: row.lead.specialization,
          admissionState: row.lead.admissionState,
          admissionStatus: row.lead.admissionStatus,
          programInterest: row.lead.programInterest,
          address: row.lead.address,
          district: row.lead.district,
          state: row.lead.state,
          pincode: row.lead.pincode,
          sslcBoard: row.lead.sslcBoard,
          sslcYear: row.lead.sslcYear,
          sslcPercent: decimalToNumber(row.lead.sslcPercent),
          pucBoard: row.lead.pucBoard,
          pucYear: row.lead.pucYear,
          pucPercent: decimalToNumber(row.lead.pucPercent),
          degreeName: row.lead.degreeName,
          degreeStream: row.lead.degreeStream,
          degreeCollege: row.lead.degreeCollege,
          degreeUniversity: row.lead.degreeUniversity,
          degreePercent: decimalToNumber(row.lead.degreePercent),
        }
      : null,
    user: {
      ...row.user,
      dateOfBirth: row.user.dateOfBirth?.toISOString() ?? null,
      passportExpiry: row.user.passportExpiry?.toISOString() ?? null,
      sslcPercent: decimalToNumber(row.user.sslcPercent),
      pucPercent: decimalToNumber(row.user.pucPercent),
      degreePercent: decimalToNumber(row.user.degreePercent),
    },
    paymentSummary: {
      applicationFee,
      paidRupees,
      remainingDue,
      panelState: studentPaymentPanelState({
        leadStatus,
        applicationFee,
        paidRupees,
        applicationStatus: row.status,
        paymentStatus: row.paymentStatus,
      }),
    },
    transactions: payments.map((p) => ({
      id: p.id,
      transactionRef: p.transactionRef,
      amount: decimalToNumber(p.amount) ?? 0,
      status: p.status,
      paymentMethod: p.paymentMethod,
      collectedBy: p.collectedBy,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

export async function listStudentApplications(userId: string) {
  return prisma.application.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      referenceCode: true,
      university: { select: { name: true, code: true } },
      lead: { select: { stream: { select: { name: true } } } },
    },
  });
}

export async function getStudentApplication(userId: string, applicationId?: string | null) {
  const where: Prisma.ApplicationWhereInput = { userId };
  if (applicationId) {
    where.id = applicationId;
  }

  const row = await prisma.application.findFirst({
    where,
    orderBy: { createdAt: "desc" },
    include: applicationInclude,
  });

  if (!row) return null;
  return serializeApplication(row);
}

export function buildFeesPayload(app: NonNullable<Awaited<ReturnType<typeof getStudentApplication>>>) {
  const { feesSnapshot, programme, university, paymentSummary, transactions } = app;
  const netDues = paymentSummary.remainingDue;

  return {
    applicationId: app.id,
    programme: {
      universityName: university?.name ?? "—",
      stream: programme?.name ?? "—",
      intakeMonth: programme?.intakeMonth ?? "—",
      academicYear: programme?.academicYear ?? "—",
    },
    breakdown: [
      { label: "Application Fee", amount: feesSnapshot.applicationFee },
      { label: "Tuition Fee (Year 1)", amount: feesSnapshot.tuitionYear1 },
      { label: "College / Admission Fee", amount: feesSnapshot.collegeFee },
      { label: "Net Dues Payable Now", amount: netDues, highlight: true },
    ],
    paymentSummary,
    transactions,
  };
}
