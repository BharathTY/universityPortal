"use client";

import * as React from "react";
import {
  formatCetAllocation,
  formatMoney,
  formatMouTenureLabel,
  formatStatusLabel,
  formatUniversityTypeLabel,
  type UniversityProfileView,
} from "@/lib/university-profile-view";
import { formatCreatedOn } from "@/lib/university-list-format";

type UniversityViewSliderProps = {
  universityId: string | null;
  universityName: string;
  onClose: () => void;
};

function ViewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[var(--border)] py-4 last:border-b-0">
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function ViewField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-[var(--foreground-muted)]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[var(--foreground)]">{value ?? "—"}</dd>
    </div>
  );
}

function ViewGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>;
}

export function UniversityNameOpenSlider({
  universityId,
  name,
  code,
}: {
  universityId: string;
  name: string;
  code: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left font-medium text-[var(--primary)] hover:underline"
      >
        {name}
      </button>
      <div className="font-mono text-xs text-[var(--foreground-muted)]">{code}</div>
      <UniversityViewSlider
        universityId={open ? universityId : null}
        universityName={name}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export function UniversityViewSlider({ universityId, universityName, onClose }: UniversityViewSliderProps) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<UniversityProfileView | null>(null);
  const open = universityId != null;

  React.useEffect(() => {
    if (!open || !universityId) return;

    setBusy(true);
    setError(null);
    void fetch(`/api/master/universities/${universityId}/profile`)
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) {
          setError((json as { error?: string }).error ?? "Could not load university details");
          setProfile(null);
          return;
        }
        setProfile(json as UniversityProfileView);
      })
      .catch(() => {
        setError("Could not load university details");
        setProfile(null);
      })
      .finally(() => setBusy(false));
  }, [open, universityId]);

  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130]" role="presentation">
      <button
        type="button"
        aria-label="Close university details"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${universityName} details`}
        className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)]">View only</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">{universityName}</h2>
            {profile ? (
              <p className="mt-0.5 font-mono text-xs text-[var(--foreground-muted)]">{profile.code}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm font-medium hover:bg-[var(--muted)]/50"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2">
          {busy ? (
            <p className="py-8 text-sm text-[var(--foreground-muted)]">Loading university details…</p>
          ) : error ? (
            <p className="py-8 text-sm text-red-600">{error}</p>
          ) : !profile ? (
            <p className="py-8 text-sm text-[var(--foreground-muted)]">No details available.</p>
          ) : (
            <>
              <ViewSection title="University details">
                <ViewGrid>
                  <ViewField label="University name" value={profile.name} />
                  <ViewField label="Status" value={formatStatusLabel(profile.status)} />
                  <ViewField label="Created on" value={formatCreatedOn(new Date(profile.createdAt))} />
                  <ViewField label="University type" value={formatUniversityTypeLabel(profile.details.universityType)} />
                  <ViewField label="Contact number" value={profile.details.phone} />
                  <ViewField label="Email ID" value={profile.details.email} />
                  <ViewField label="Location" value={profile.details.location} />
                  <ViewField label="State" value={profile.details.state} />
                  <ViewField label="District" value={profile.details.district} />
                  <ViewField label="City" value={profile.details.city} />
                  <ViewField label="Area" value={profile.details.area} />
                  <ViewField label="Pincode" value={profile.details.pincode} />
                  <ViewField label="Website" value={profile.details.website} />
                  <ViewField
                    label="Target students"
                    value={
                      profile.details.targetStudents != null
                        ? profile.details.targetStudents.toLocaleString("en-IN")
                        : "—"
                    }
                  />
                </ViewGrid>
                {profile.details.logoUrl ? (
                  <div>
                    <p className="text-xs font-medium text-[var(--foreground-muted)]">Logo</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profile.details.logoUrl}
                      alt=""
                      className="mt-2 h-16 w-16 rounded-md border border-[var(--border)] object-contain"
                    />
                  </div>
                ) : null}
              </ViewSection>

              <ViewSection title="University SPOC details">
                {profile.spocs.length === 0 ? (
                  <p className="text-sm text-[var(--foreground-muted)]">No SPOC records.</p>
                ) : (
                  profile.spocs.map((spoc, index) => (
                    <div key={index} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                      <p className="text-xs font-semibold text-[var(--foreground-muted)]">SPOC {index + 1}</p>
                      <ViewGrid>
                        <ViewField label="Name" value={spoc.name} />
                        <ViewField label="Designation" value={spoc.designation} />
                        <ViewField label="Mobile number" value={spoc.mobile} />
                        <ViewField label="Email ID" value={spoc.email} />
                      </ViewGrid>
                    </div>
                  ))
                )}
              </ViewSection>

              <ViewSection title="Program details">
                {profile.programs.length === 0 ? (
                  <p className="text-sm text-[var(--foreground-muted)]">No programs configured.</p>
                ) : (
                  profile.programs.map((program, index) => (
                    <div key={index} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                      <p className="text-xs font-semibold text-[var(--foreground-muted)]">Program {index + 1}</p>
                      <ViewGrid>
                        <ViewField label="Qualification type" value={program.programLevel} />
                        <ViewField label="Degree type" value={program.programName} />
                        <ViewField label="Stream" value={program.streamName} />
                        <ViewField
                          label="Total target seats"
                          value={program.targetStudents.toLocaleString("en-IN")}
                        />
                        <ViewField
                          label="CET allocation"
                          value={formatCetAllocation(program.cetAllocationMode, program.cetAllocationValue)}
                        />
                        <ViewField label="Annual tuition fee" value={formatMoney(program.tuitionYear1)} />
                        <ViewField label="Overall package fee" value={formatMoney(program.tuitionTotal)} />
                        <ViewField label="Registration fee" value={formatMoney(program.registrationFee)} />
                        <ViewField label="Application fee" value={formatMoney(program.applicationFee)} />
                        <ViewField label="Exam fee" value={formatMoney(program.examFee)} />
                        <ViewField
                          label="Other administrative fee"
                          value={formatMoney(program.otherAdminAmount)}
                        />
                      </ViewGrid>
                    </div>
                  ))
                )}
              </ViewSection>

              <ViewSection title="Hostel details">
                <ViewGrid>
                  <ViewField label="Hostel available" value={profile.hostel.available ? "Yes" : "No"} />
                  <ViewField label="Food fee" value={formatMoney(profile.hostel.foodFee)} />
                </ViewGrid>
                {profile.hostel.entries.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {profile.hostel.entries.map((entry, index) => (
                      <li key={index} className="rounded-md border border-[var(--border)] px-3 py-2">
                        <span className="font-medium">{entry.label}</span>
                        <span className="text-[var(--foreground-muted)]"> — {formatMoney(entry.feePerYear)} / year</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </ViewSection>

              <ViewSection title="Scholarship details">
                {profile.scholarships.length === 0 ? (
                  <p className="text-sm text-[var(--foreground-muted)]">No scholarships configured.</p>
                ) : (
                  profile.scholarships.map((scholarship, index) => (
                    <div key={index} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                      <ViewGrid>
                        <ViewField label="Scholarship type" value={scholarship.typeLabel} />
                        <ViewField label="Scholarship value" value={scholarship.value} />
                      </ViewGrid>
                    </div>
                  ))
                )}
              </ViewSection>

              <ViewSection title="Document uploads">
                <ViewGrid>
                  <ViewField label="MOU year" value={profile.mou.year} />
                  <ViewField label="MOU tenure" value={formatMouTenureLabel(profile.mou.tenure)} />
                </ViewGrid>
                <ViewField
                  label="MOU documents"
                  value={
                    profile.mou.documents.length === 0 ? (
                      "—"
                    ) : (
                      <ul className="space-y-1">
                        {profile.mou.documents.map((doc, index) => (
                          <li key={index}>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--primary)] hover:underline"
                            >
                              {doc.fileName}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )
                  }
                />
                <ViewField
                  label="Event photos"
                  value={
                    profile.mou.eventPhotos.length === 0 ? (
                      "—"
                    ) : (
                      <ul className="space-y-2">
                        {profile.mou.eventPhotos.map((photo, index) => (
                          <li key={index}>
                            <a
                              href={photo.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-[var(--primary)] hover:underline"
                            >
                              {photo.fileName}
                            </a>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.fileUrl}
                              alt=""
                              className="mt-1 h-20 w-20 rounded-md border border-[var(--border)] object-cover"
                            />
                          </li>
                        ))}
                      </ul>
                    )
                  }
                />
              </ViewSection>

              <ViewSection title="MOU SPOC details">
                {profile.mouSpocs.length === 0 ? (
                  <p className="text-sm text-[var(--foreground-muted)]">No MOU SPOC records.</p>
                ) : (
                  profile.mouSpocs.map((spoc, index) => (
                    <div key={index} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                      <p className="text-xs font-semibold text-[var(--foreground-muted)]">MOU SPOC {index + 1}</p>
                      <ViewGrid>
                        <ViewField label="Name" value={spoc.name} />
                        <ViewField label="Designation" value={spoc.designation} />
                        <ViewField label="Mobile number" value={spoc.mobile} />
                        <ViewField label="Email ID" value={spoc.email} />
                      </ViewGrid>
                    </div>
                  ))
                )}
              </ViewSection>

              <ViewSection title="Admissions">
                <ViewField label="Total admissions" value={profile.admissionsCount.toLocaleString("en-IN")} />
              </ViewSection>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
