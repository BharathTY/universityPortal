"use client";

import * as React from "react";

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

export default function StudentProfilePage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
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

  function updateField<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
    setSaved(false);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.fullName.trim(),
          phone: profile.mobile.trim(),
          whatsappNumber: profile.whatsapp.trim() || null,
          gender: profile.gender || null,
          dateOfBirth: profile.dateOfBirth || null,
          stateStudent: profile.state.trim() || null,
          districtStudent: profile.district.trim() || null,
          pincode: profile.pincode.trim() || null,
          pucType: profile.pucType.trim() || null,
          pucInstitution: profile.pucInstitution.trim() || null,
          pucYear: profile.pucYear,
          pucPercent: profile.pucPercent.trim() || null,
          ieltsScore: profile.ieltsScore.trim() || null,
          toeflScore: profile.toeflScore.trim() || null,
          passportNumber: profile.passportNumber.trim() || null,
          passportExpiry: profile.passportExpiry || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save profile");
        return;
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

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

  const inputClass =
    "mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Profile</h1>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Update your personal and academic details. Email cannot be changed here.
        </p>
      </div>

      <form onSubmit={onSave} className="space-y-6">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold">Personal</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Full name</label>
              <input value={profile.fullName} onChange={(e) => updateField("fullName", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Email</label>
              <input value={profile.email} readOnly className={`${inputClass} bg-[var(--muted)]/40`} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Mobile</label>
              <input value={profile.mobile} onChange={(e) => updateField("mobile", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">WhatsApp</label>
              <input value={profile.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Gender</label>
              <select value={profile.gender} onChange={(e) => updateField("gender", e.target.value)} className={inputClass}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Date of birth</label>
              <input type="date" value={profile.dateOfBirth} onChange={(e) => updateField("dateOfBirth", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">State</label>
              <input value={profile.state} onChange={(e) => updateField("state", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">District</label>
              <input value={profile.district} onChange={(e) => updateField("district", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Pincode</label>
              <input value={profile.pincode} onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} className={inputClass} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold">Academic</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">PUC type</label>
              <input value={profile.pucType} onChange={(e) => updateField("pucType", e.target.value)} placeholder="PUC / Diploma" className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Institution</label>
              <input value={profile.pucInstitution} onChange={(e) => updateField("pucInstitution", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Year</label>
              <input
                value={profile.pucYear ?? ""}
                onChange={(e) => updateField("pucYear", e.target.value ? Number(e.target.value) : null)}
                inputMode="numeric"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Percentage</label>
              <input value={profile.pucPercent} onChange={(e) => updateField("pucPercent", e.target.value)} className={inputClass} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold">Entrance &amp; passport</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">IELTS</label>
              <input value={profile.ieltsScore} onChange={(e) => updateField("ieltsScore", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">TOEFL</label>
              <input value={profile.toeflScore} onChange={(e) => updateField("toeflScore", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Passport number</label>
              <input value={profile.passportNumber} onChange={(e) => updateField("passportNumber", e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">Passport expiry</label>
              <input type="date" value={profile.passportExpiry} onChange={(e) => updateField("passportExpiry", e.target.value)} className={inputClass} />
            </div>
          </div>
        </section>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {saved ? <p className="text-sm text-green-700">Profile saved.</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
