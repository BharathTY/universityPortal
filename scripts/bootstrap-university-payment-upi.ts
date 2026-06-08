import { defaultCollectPaymentUpiIdFromEnv } from "@/lib/university-payment-upi";
import { PrismaClient } from "@prisma/client";

async function main() {
  const upi = defaultCollectPaymentUpiIdFromEnv();
  if (!upi) {
    console.log("Set NEXT_PUBLIC_COLLECT_UPI_ID to bootstrap university payment UPI IDs.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    const result = await prisma.university.updateMany({
      where: { OR: [{ paymentUpiId: null }, { paymentUpiId: "" }] },
      data: { paymentUpiId: upi },
    });
    console.log(`Updated ${result.count} universities with paymentUpiId: ${upi}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
