import { NextResponse } from "next/server";
import { getPaymentSplitConfig, splitPaymentRupees } from "@/lib/payment-split";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const amountRaw = url.searchParams.get("amountRupees");
  const config = getPaymentSplitConfig();

  if (amountRaw == null || amountRaw.trim() === "") {
    return NextResponse.json({ config });
  }

  const amountRupees = Number(amountRaw);
  if (!Number.isFinite(amountRupees) || amountRupees < 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const split = splitPaymentRupees(amountRupees);
  return NextResponse.json({ config, split });
}
