export function buildUpiPayUri(params: {
  upiId: string;
  amountRupees?: number;
  payeeName: string;
  /** UPI apps may open this URL in the browser after a successful payment. */
  returnUrl?: string;
}): string {
  const search = new URLSearchParams();
  search.set("pa", params.upiId);
  search.set("pn", params.payeeName.slice(0, 50));
  if (params.amountRupees != null && Number.isFinite(params.amountRupees) && params.amountRupees > 0) {
    search.set("am", params.amountRupees.toFixed(2));
  }
  search.set("cu", "INR");
  if (params.returnUrl?.trim()) {
    search.set("url", params.returnUrl.trim());
  }
  return `upi://pay?${search.toString()}`;
}
