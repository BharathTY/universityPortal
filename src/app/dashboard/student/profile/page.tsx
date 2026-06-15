"use client";

import * as React from "react";
import Link from "next/link";
import { StudentProfileForm } from "@/components/student/student-profile-form";
import { cardClass } from "@/components/student/student-portal-ui";
import type { StudentProfilePrefill } from "@/lib/student-lead-prefill";

export default function StudentProfilePage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [photoUploading, setPhotoUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [applicationId, setApplicationId] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<StudentProfilePrefill | null>(null);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/student/application");
        const data = (await res.json().catch(() => ({}))) as {
          application?: { id: string; profile: StudentProfilePrefill } | null;
          error?: string;
        };
        if (!res.ok) {
          setError(data.error ?? "Could not load profile");
          return;
        }
        const app = data.application ?? null;
        if (app) {
          setApplicationId(app.id);
          setProfile(app.profile);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function uploadPhoto(file: File) {
    if (!applicationId) return;
    setPhotoUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("applicationId", applicationId);
      form.set("photoFile", file);
      const res = await fetch("/api/student/application/photo", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { photoUrl?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Photo upload failed");
        return;
      }
      if (data.photoUrl) {
        setProfile((prev) => (prev ? { ...prev, photoUrl: data.photoUrl! } : prev));
      }
    } finally {
      setPhotoUploading(false);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!applicationId || !profile) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    setFieldErrors({});
    try {
      const res = await fetch("/api/student/application", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, submitProfile: false, ...profile }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: Record<string, string[] | string>;
      };
      if (!res.ok) {
        const fe: Record<string, string> = {};
        if (data.fieldErrors) {
          for (const [k, v] of Object.entries(data.fieldErrors)) {
            if (Array.isArray(v) && typeof v[0] === "string") fe[k] = v[0];
            else if (typeof v === "string") fe[k] = v;
          }
        }
        if (Object.keys(fe).length > 0) setFieldErrors(fe);
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

  if (!profile || !applicationId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Profile</h1>
        <p className="mt-4 text-sm text-[var(--foreground-muted)]">
          {error ?? "No application is linked to your account yet. Your consultant will create a lead before you can view your profile."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Profile</h1>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Details entered by your consultant are pre-filled below. Review and update as needed. To submit your profile and pay the application fee, go to{" "}
          <Link href="/dashboard/student/application" className="text-[var(--primary)] underline">
            My Application
          </Link>
          .
        </p>
      </div>

      <form onSubmit={onSave} className={cardClass}>
        <StudentProfileForm
          profile={profile}
          onChange={(patch) => {
            setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
            setSaved(false);
          }}
          fieldErrors={fieldErrors}
          onPhotoUpload={uploadPhoto}
          photoUploading={photoUploading}
        />

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {saved ? <p className="mt-4 text-sm text-green-700">Profile saved.</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
