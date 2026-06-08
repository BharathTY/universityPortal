import type { Prisma } from "@prisma/client";
import { resolveApplicationFeeRupees } from "@/lib/student-portal";

type FeeLeadRow = {
  stream: {
    applicationFee: Prisma.Decimal | null;
  };
  university: {
    applicationFee: Prisma.Decimal | null;
  };
};

export function resolveLeadRegistrationFeeRupeesFromRow(row: FeeLeadRow): number {
  return resolveApplicationFeeRupees(row.stream, row.university);
}
