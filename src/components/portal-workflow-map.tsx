"use client";

import Link from "next/link";
import * as React from "react";
import type { StudentPortalJourney } from "@/lib/dashboard-data";

type StaffKind = "master" | "university" | "consultant";

type Props =
  | { mode: "student"; journey: StudentPortalJourney }
  | { mode: "staff"; staffKind: StaffKind };

function studentStepIndex(j: StudentPortalJourney): number {
  if (j.pendingInvite) return 0;
  if (!j.hasApplication) return 1;
  if (!j.registrationPaid) return 2;
  if (!j.programPaid) return 3;
  if (!j.visitsScheduled) return 4;
  return 5;
}

const studentMilestones = [
  { id: "invite", title: "Invitation", hint: "Accept your email invite to unlock the portal." },
  { id: "link", title: "Application linked", hint: "Your admission record is connected — open the student portal." },
  { id: "reg", title: "Registration fee", hint: "Pay the standard or custom registration amount (Razorpay or dev simulation)." },
  { id: "prog", title: "Program fee", hint: "Complete the programme fee to unlock visit scheduling." },
  { id: "visit", title: "Campus visits", hint: "Book admission counselling and a campus tour slot." },
  { id: "done", title: "Journey complete", hint: "All portal steps finished — watch your email for next steps from the university." },
] as const;

/** Four-lane storyboard so the grid stays balanced on wide screens. */
function staffLanes(kind: StaffKind): { title: string; steps: { label: string; detail: string }[] }[] {
  if (kind === "master") {
    return [
      {
        title: "1 · Platform",
        steps: [
          { label: "Universities", detail: "Create institutions, codes, logos, and academic structure." },
          { label: "Network health", detail: "Admission partner headcount and student coverage per campus." },
        ],
      },
      {
        title: "2 · Capture",
        steps: [
          { label: "Leads & batches", detail: "Brochure QR, batch punch, referrals, and attribution." },
          { label: "Admissions desk", detail: "Staff enter leads — By consultant or By university." },
        ],
      },
      {
        title: "3 · Onboard",
        steps: [
          { label: "Partner conversion", detail: "Qualify leads, convert to a portal student record." },
          { label: "Invitations", detail: "Email invite → accept → student dashboard & application." },
        ],
      },
      {
        title: "4 · Commit",
        steps: [
          { label: "Fees & verification", detail: "Razorpay orders, checkout, HMAC verify, payment fetch." },
          { label: "Visits & done", detail: "Counselling + tour slots, confirmation, email receipts." },
        ],
      },
    ];
  }
  if (kind === "university") {
    return [
      {
        title: "1 · Your org",
        steps: [
          { label: "Admissions hub", detail: "Years, streams, lead list, and admission partner roster." },
          { label: "Batches", detail: "Operational cohorts with Lead Punch tokens in the field." },
        ],
      },
      {
        title: "2 · Intake",
        steps: [
          { label: "Lead sources", detail: "Partner codes, desk entry, and batch-attributed prospects." },
          { label: "Pipeline hygiene", detail: "NEW → converted or lost before duplicate noise." },
        ],
      },
      {
        title: "3 · Students",
        steps: [
          { label: "Invites", detail: "Consultants invite; you monitor acceptance and roster." },
          { label: "Applications", detail: "Cross-student metrics under Applications in the nav." },
        ],
      },
      {
        title: "4 · Close",
        steps: [
          { label: "Digital fees", detail: "Students pay registration & programme fees in-portal." },
          { label: "Campus experience", detail: "Visit datetimes captured on the student application." },
        ],
      },
    ];
  }
  return [
    {
      title: "1 · Desk",
      steps: [
        { label: "Universities hub", detail: "Jump between institutions you are linked to." },
        { label: "Partner leads", detail: "Your funnel, convert, optional bulk CSV on batches." },
      ],
    },
    {
      title: "2 · Field",
      steps: [
        { label: "Batch & QR", detail: "Brochure flows stamp batch + partner on new leads." },
        { label: "Roster", detail: "Manage users — pending vs accepted invites at a glance." },
      ],
    },
    {
      title: "3 · Handoff",
      steps: [
        { label: "Convert lead", detail: "Creates the student + application shell for the portal." },
        { label: "Student comms", detail: "They complete details, fees, Razorpay, and visits themselves." },
      ],
    },
    {
      title: "4 · Outcome",
      steps: [
        { label: "Paid & scheduled", detail: "Registration + programme fee gates visit scheduling." },
        { label: "University visibility", detail: "Assigned partner snapshots stay staff-side only." },
      ],
    },
  ];
}

function NodeDot({ state, stepNumber }: { state: "done" | "current" | "upcoming"; stepNumber: number }) {
  return (
    <span
      className={[
        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition",
        state === "done" &&
          "border-emerald-500/80 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/70 dark:text-emerald-200",
        state === "current" &&
          "border-[var(--accent-blue)] bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] shadow-[0_0_0_4px_rgba(59,130,246,0.15)] dark:shadow-[0_0_0_4px_rgba(96,165,250,0.12)]",
        state === "upcoming" && "border-[var(--border)] bg-[var(--muted)]/40 text-[var(--foreground-muted)]",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    >
      {state === "done" ? "✓" : stepNumber}
    </span>
  );
}

function RailSegment({ filled }: { filled: boolean }) {
  return (
    <div className="relative mx-1 hidden h-0.5 min-w-[1.25rem] flex-1 sm:mx-2 sm:block" aria-hidden>
      <div className="absolute inset-0 rounded-full bg-[var(--border)]" />
      <div
        className={[
          "absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500/80 to-[var(--accent-blue)] transition-all motion-safe:duration-700",
          filled ? "w-full opacity-100" : "w-0 opacity-0",
        ].join(" ")}
      />
    </div>
  );
}

export function PortalWorkflowMap(props: Props) {
  if (props.mode === "staff") {
    const lanes = staffLanes(props.staffKind);
    return (
      <section
        className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
        aria-labelledby="portal-workflow-staff-title"
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--accent-blue)]/[0.07] blur-3xl motion-safe:animate-pulse"
          style={{ animationDuration: "4s" }}
        />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-violet-500/[0.06] blur-2xl" />
        <div className="relative p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
                Live map
              </p>
              <h2 id="portal-workflow-staff-title" className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                How work flows through this portal
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-[var(--foreground-muted)]">
                From first touch to confirmed campus visits — one continuous pipeline. Your shortcuts sit in the
                sidebar; this is the big picture.
              </p>
            </div>
            <span className="rounded-full border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-1 text-xs font-medium text-[var(--foreground-muted)]">
              Read-only reference
            </span>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {lanes.map((lane) => (
              <div
                key={lane.title}
                className="rounded-xl border border-[var(--border)] bg-[var(--background)]/60 p-4 backdrop-blur-sm"
              >
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{lane.title}</h3>
                <ul className="mt-4 space-y-3">
                  {lane.steps.map((s) => (
                    <li key={s.label} className="rounded-lg border border-[var(--border)]/80 bg-[var(--card)] px-3 py-2.5">
                      <p className="text-sm font-medium text-[var(--foreground)]">{s.label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[var(--foreground-muted)]">{s.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const { journey } = props;
  const active = studentStepIndex(journey);

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
      aria-labelledby="portal-workflow-student-title"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(59,130,246,0.12),transparent_50%),radial-gradient(ellipse_at_80%_100%,rgba(139,92,246,0.08),transparent_45%)] opacity-90 motion-reduce:opacity-60"
        aria-hidden
      />
      <div className="relative border-b border-[var(--border)] bg-[var(--card)]/95 px-5 py-4 backdrop-blur-sm sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
              Your journey
            </p>
            <h2 id="portal-workflow-student-title" className="text-lg font-semibold text-[var(--foreground)]">
              Admission pipeline — live status
            </h2>
          </div>
          <Link
            href="/dashboard/student/application"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[var(--accent-blue-hover)]"
          >
            Open student portal
            <span aria-hidden>↗</span>
          </Link>
        </div>
        {journey.hasApplication ? (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--foreground-muted)]">
            <span>
              Registration:{" "}
              <strong className={journey.registrationPaid ? "text-emerald-600 dark:text-emerald-400" : ""}>
                {journey.registrationPaid ? "Paid" : "Due"}
              </strong>
            </span>
            <span>
              Programme fee:{" "}
              <strong className={journey.programPaid ? "text-emerald-600 dark:text-emerald-400" : ""}>
                {journey.programPaid ? "Paid" : "Due"}
              </strong>
            </span>
            <span>
              Visits:{" "}
              <strong className={journey.visitsScheduled ? "text-emerald-600 dark:text-emerald-400" : ""}>
                {journey.visitsScheduled ? "Scheduled" : "Not yet"}
              </strong>
            </span>
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--foreground-muted)]">
            When your admission partner converts your lead, your application appears here and the rail below lights
            up.
          </p>
        )}
      </div>

      <div className="relative overflow-x-auto bg-[var(--background)]/40 px-4 py-8 sm:px-6">
        <div className="flex min-w-[min(100%,52rem)] flex-col gap-6 sm:min-w-0 sm:flex-row sm:items-start sm:justify-between">
          {studentMilestones.map((m, i) => {
            const state: "done" | "current" | "upcoming" =
              i < active ? "done" : i === active ? "current" : "upcoming";
            return (
              <React.Fragment key={m.id}>
                <div className="flex flex-1 flex-col items-center text-center sm:min-w-0">
                  <NodeDot state={state} stepNumber={i + 1} />
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--foreground-muted)]">
                    Step {i + 1}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{m.title}</p>
                  <p className="mt-1 max-w-[11rem] text-xs leading-relaxed text-[var(--foreground-muted)]">{m.hint}</p>
                </div>
                {i < studentMilestones.length - 1 ? <RailSegment filled={i < active} /> : null}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
