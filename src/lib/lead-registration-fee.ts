import type { Prisma } from "@prisma/client";
import { resolveApplicationFeeRupees } from "@/lib/student-portal";

type FeeLeadRow = {
  stream: {
    applicationFee: Prisma.Decimal | null;
    streamFee: Prisma.Decimal | null;
    tuitionYear1: Prisma.Decimal | null;
    collegeFee: Prisma.Decimal | null;
  };
  university: {
    registrationFee: Prisma.Decimal | null;
    applicationFee: Prisma.Decimal | null;
  };
};

export function resolveLeadRegistrationFeeRupeesFromRow(row: FeeLeadRow): number {
  return resolveApplicationFeeRupees(row.stream, row.university);
}
