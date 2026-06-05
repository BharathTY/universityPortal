import { Prisma } from "@prisma/client";
import { HOSTEL_FEE_COMBOS, type HostelFeeAmounts, type HostelFeeKey } from "@/lib/hostel-fee-matrix";

type Tx = Pick<Prisma.TransactionClient, "universityHostelFee">;

/** Upsert or delete hostel fee rows for all 16 gender × room × sharing combinations. */
export async function syncUniversityHostelFees(
  tx: Tx,
  universityId: string,
  fees: Partial<HostelFeeAmounts>,
) {
  for (const def of HOSTEL_FEE_COMBOS) {
    if (!(def.key in fees)) continue;
    const raw = fees[def.key as HostelFeeKey];

    const existing = await tx.universityHostelFee.findUnique({
      where: {
        universityId_gender_roomType_sharing: {
          universityId,
          gender: def.gender,
          roomType: def.roomType,
          sharing: def.sharing,
        },
      },
    });

    if (raw === undefined) continue;

    if (raw === null) {
      if (existing) {
        await tx.universityHostelFee.delete({ where: { id: existing.id } });
      }
      continue;
    }

    if (!Number.isFinite(raw) || raw < 0) {
      throw new Error("Invalid hostel fee amount");
    }

    await tx.universityHostelFee.upsert({
      where: {
        universityId_gender_roomType_sharing: {
          universityId,
          gender: def.gender,
          roomType: def.roomType,
          sharing: def.sharing,
        },
      },
      create: {
        universityId,
        gender: def.gender,
        roomType: def.roomType,
        sharing: def.sharing,
        amount: new Prisma.Decimal(Number(raw).toFixed(2)),
      },
      update: { amount: new Prisma.Decimal(Number(raw).toFixed(2)) },
    });
  }
}
