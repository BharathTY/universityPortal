export function notifyLeadPaymentDone(leadId: string) {
  try {
    window.opener?.postMessage({ type: "lead-payment-done", leadId }, window.location.origin);
  } catch {
    /* ignore */
  }
}

export function tryClosePaymentWindow(leadId: string) {
  notifyLeadPaymentDone(leadId);
  window.close();
}
