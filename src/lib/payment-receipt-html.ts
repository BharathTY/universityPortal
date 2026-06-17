import { PORTAL_BRAND_NAME } from "@/components/portal-logo";

export type PaymentReceiptData = {
  transactionRef: string;
  amountLabel: string;
  status: string;
  paidAt: string | Date;
  universityName: string;
  studentName?: string | null;
  paymentMethod?: string | null;
  applicationId?: string | null;
  remarks?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatReceiptDate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildPaymentReceiptHtml(data: PaymentReceiptData): string {
  const paidAt = formatReceiptDate(data.paidAt);
  const status = data.status.toUpperCase();
  const statusColor = status === "SUCCESS" ? "#15803d" : "#b45309";

  const optionalRows: string[] = [];
  if (data.studentName?.trim()) {
    optionalRows.push(row("Student name", data.studentName.trim()));
  }
  if (data.applicationId?.trim()) {
    optionalRows.push(row("Application ID", data.applicationId.trim()));
  }
  if (data.paymentMethod?.trim()) {
    optionalRows.push(row("Payment method", data.paymentMethod.trim()));
  }
  if (data.remarks?.trim()) {
    optionalRows.push(row("Remarks", data.remarks.trim()));
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Payment Receipt — ${escapeHtml(data.transactionRef)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px 16px;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      background: #f4f6fb;
      color: #1e293b;
    }
    .receipt {
      max-width: 640px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      color: #fff;
      padding: 24px 28px;
    }
    .brand { font-size: 1.25rem; font-weight: 700; letter-spacing: 0.02em; }
    .subtitle { margin-top: 4px; font-size: 0.875rem; opacity: 0.9; }
    .badge {
      display: inline-block;
      margin-top: 14px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(255,255,255,0.16);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .body { padding: 24px 28px 28px; }
    .amount {
      font-size: 2rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 6px;
    }
    .status {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: ${statusColor};
      background: ${status === "SUCCESS" ? "#dcfce7" : "#fef3c7"};
      margin-bottom: 20px;
    }
    table { width: 100%; border-collapse: collapse; }
    td {
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
      font-size: 0.9375rem;
    }
    td.label {
      width: 42%;
      color: #64748b;
      font-weight: 500;
    }
    td.value {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
      word-break: break-word;
    }
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px dashed #cbd5e1;
      font-size: 0.8125rem;
      color: #64748b;
      line-height: 1.5;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .receipt { box-shadow: none; border: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="brand">${escapeHtml(PORTAL_BRAND_NAME)}</div>
      <div class="subtitle">Official payment receipt</div>
      <div class="badge">Application fee</div>
    </div>
    <div class="body">
      <p class="amount">${escapeHtml(data.amountLabel)}</p>
      <div class="status">${escapeHtml(status)}</div>
      <table>
        ${row("Transaction reference", data.transactionRef)}
        ${row("University", data.universityName)}
        ${optionalRows.join("\n        ")}
        ${row("Date & time", paidAt)}
      </table>
      <div class="footer">
        This is a computer-generated receipt from ${escapeHtml(PORTAL_BRAND_NAME)}.
        Please retain it for your records. For payment disputes, quote the transaction reference above.
      </div>
    </div>
  </div>
</body>
</html>`;
}

function row(label: string, value: string): string {
  return `<tr><td class="label">${escapeHtml(label)}</td><td class="value">${escapeHtml(value)}</td></tr>`;
}

/** Trigger download of receipt as .html file (client-side). */
export function downloadPaymentReceiptHtml(data: PaymentReceiptData): void {
  const html = buildPaymentReceiptHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `receipt-${data.transactionRef.replace(/[^\w-]+/g, "_")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Open printable receipt in a new browser tab. */
export function openPaymentReceiptHtml(data: PaymentReceiptData): void {
  const html = buildPaymentReceiptHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
