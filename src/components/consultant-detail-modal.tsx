"use client";

import * as React from "react";

type ConsultantDetail = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  companyName: string | null;
  designation: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  academicYear: string | null;
  accountStatus: string;
  createdAt: string;
  universities: { id: string; name: string; code: string }[];
  mouDocuments: { fileName: string; fileUrl: string; academicYear: string | null }[];
  spocs: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    whatsapp: string | null;
    designation: string | null;
    accountStatus: string;
  }[];
};

type SpocDetail = ConsultantDetail["spocs"][number];

function DetailModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="Dismiss" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[121] flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
          <button type="button" onClick={onClose} className="text-sm text-[var(--foreground-muted)] hover:underline">
            Close
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[var(--foreground)]">{value || "—"}</dd>
    </div>
  );
}

export function ConsultantDetailModal({
  consultantId,
  onClose,
}: {
  consultantId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<ConsultantDetail | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void fetch(`/api/master/consultants/${consultantId}`)
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as ConsultantDetail & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Could not load consultant");
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load consultant");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [consultantId]);

  return (
    <DetailModal title="Consultant details" onClose={onClose}>
      {loading ? <p className="text-sm text-[var(--foreground-muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {data ? (
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field label="Consultant name" value={data.name} />
          <Field label="Company name" value={data.companyName} />
          <Field label="Email ID" value={data.email} />
          <Field label="Phone number" value={data.phone} />
          <Field label="GST number" value={data.gstNumber} />
          <Field label="PAN number" value={data.panNumber} />
          <Field label="Address" value={data.address} />
          <Field label="City" value={data.city} />
          <Field label="District" value={data.district} />
          <Field label="State" value={data.state} />
          <Field label="Academic year" value={data.academicYear} />
          <Field label="Status" value={data.accountStatus} />
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              Assigned universities
            </dt>
            <dd className="mt-1 text-sm text-[var(--foreground)]">
              {data.universities.length === 0
                ? "—"
                : data.universities.map((u) => `${u.name} (${u.code})`).join(", ")}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              MOU documents
            </dt>
            <dd className="mt-1 space-y-1 text-sm">
              {data.mouDocuments.length === 0
                ? "—"
                : data.mouDocuments.map((doc) => (
                    <a
                      key={doc.fileUrl}
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-[var(--primary)] hover:underline"
                    >
                      {doc.fileName}
                      {doc.academicYear ? ` (${doc.academicYear})` : ""}
                    </a>
                  ))}
            </dd>
          </div>
        </dl>
      ) : null}
    </DetailModal>
  );
}

export function ConsultantSpocDetailModal({ spoc, onClose }: { spoc: SpocDetail; onClose: () => void }) {
  return (
    <DetailModal title="SPOC details" onClose={onClose}>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Field label="SPOC name" value={spoc.name} />
        <Field label="Designation" value={spoc.designation} />
        <Field label="Email ID" value={spoc.email} />
        <Field label="Mobile" value={spoc.phone} />
        <Field label="WhatsApp" value={spoc.whatsapp} />
        <Field label="Status" value={spoc.accountStatus} />
      </dl>
    </DetailModal>
  );
}
