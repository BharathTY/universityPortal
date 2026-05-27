"use client";

import * as React from "react";

type ProfileRow = { label: string; value: string };

type ProfileData = {
  fullName: string;
  email: string;
  mobile: string;
  whatsapp: string;
  gender: string;
  dateOfBirth: string;
  state: string;
  district: string;
  pincode: string;
  pucType: string;
  pucInstitution: string;
  pucYear: number | null;
  pucPercent: string;
  ieltsScore: string;
  toeflScore: string;
  passportNumber: string;
  passportExpiry: string;
};

function ProfileSection({ title, rows }: { title: string; rows: ProfileRow[] }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
              {row.label}
            </dt>
            <dd className="mt-1 text-sm font-medium text-[var(--foreground)]">{row.value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function StudentProfilePage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<ProfileData | null>(null);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/student/profile");
        const data = (await res.json().catch(() => ({}))) as { profile?: ProfileData; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Could not load profile");
          return;
        }
        setProfile(data.profile ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm text-[var(--foreground-muted)]">Loading…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Profile</h1>
        <p className="mt-4 text-sm text-[var(--foreground-muted)]">{error ?? "Profile not available."}</p>
      </div>
    );
  }

  const pucDetail =
    profile.pucInstitution !== "—"
      ? `${profile.pucType !== "—" ? profile.pucType + " · " : ""}${profile.pucInstitution}${
          profile.pucYear ? ` (${profile.pucYear})` : ""
        }${profile.pucPercent !== "—" ? ` — ${profile.pucPercent}%` : ""}`
      : "—";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Profile</h1>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Read-only record of information submitted to your university and consultant.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <ProfileSection
        title="Personal"
        rows={[
          { label: "Full name", value: profile.fullName },
          { label: "Email", value: profile.email },
          { label: "Mobile", value: profile.mobile },
          { label: "WhatsApp", value: profile.whatsapp },
          { label: "Gender", value: profile.gender },
          { label: "Date of birth", value: profile.dateOfBirth },
          { label: "State", value: profile.state },
          { label: "District", value: profile.district },
          { label: "Pincode", value: profile.pincode },
        ]}
      />

      <ProfileSection
        title="Academic"
        rows={[{ label: "PUC / pre-degree", value: pucDetail }]}
      />

      <ProfileSection
        title="Entrance & passport"
        rows={[
          { label: "IELTS score", value: profile.ieltsScore },
          { label: "TOEFL score", value: profile.toeflScore },
          { label: "Passport number", value: profile.passportNumber },
          { label: "Passport expiry", value: profile.passportExpiry },
        ]}
      />
    </div>
  );
}
