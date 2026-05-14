"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

type Uni = { id: string; name: string; code: string };

type Props = { universities: Uni[] };

const NAME_OK = /^[\p{L} ]+$/u;

function mapApiFieldErrors(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(v) && typeof v[0] === "string") out[k] = v[0]!;
    else if (typeof v === "string") out[k] = v;
  }
  return out;
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function validateConsultantForm(input: {
  name: string;
  email: string;
  phone: string;
  password: string;
  selectedCount: number;
  universitiesAvailable: number;
}): Record<string, string> {
  const e: Record<string, string> = {};
  const n = input.name.trim();
  if (n.length === 0) e.name = "Name is required";
  else if (!NAME_OK.test(n)) e.name = "Name must contain only letters.";
  else if (n.length < 3) e.name = "Name must be at least 3 characters";

  const em = input.email.trim();
  if (em.length === 0) e.email = "Email is required";
  else if (!looksLikeEmail(em)) e.email = "Enter a valid email address";

  const p = input.phone.trim();
  if (p.length === 0) e.phone = "Phone number is required";
  else if (!/^\d+$/.test(p)) e.phone = "Only numbers are allowed";
  else if (p.length !== 10) e.phone = "Phone number must be 10 digits";

  if (input.password.trim().length > 0 && input.password.trim().length < 8) {
    e.password = "Password must be at least 8 characters";
  }

  if (input.universitiesAvailable > 0 && input.selectedCount < 1) {
    e.universityIds = "Please select at least one university";
  }
  if (input.universitiesAvailable === 0) {
    e.universityIds = "No universities available to assign";
  }

  return e;
}

export function NewConsultantForm({ universities }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [selectedUniIds, setSelectedUniIds] = React.useState<Set<string>>(new Set());
  /** Fixed to standard admission partner; select is disabled until branch accounts are re-enabled. */
  const partnerRole = "consultant" as const;

  const formSnapshot = React.useMemo(
    () => ({
      name,
      email,
      phone,
      password,
      selectedCount: selectedUniIds.size,
      universitiesAvailable: universities.length,
    }),
    [name, email, phone, password, selectedUniIds.size, universities.length],
  );

  const formValid = React.useMemo(
    () => Object.keys(validateConsultantForm(formSnapshot)).length === 0,
    [formSnapshot],
  );

  function borderFor(key: string) {
    return fieldErrors[key] ? "border-red-500" : "border-[var(--border)]";
  }

  function toggleUniversity(id: string) {
    setSelectedUniIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setFieldErrors((f) => {
      const n = { ...f };
      delete n.universityIds;
      return n;
    });
  }

  function selectAllUniversities() {
    setSelectedUniIds(new Set(universities.map((u) => u.id)));
    setFieldErrors((f) => {
      const n = { ...f };
      delete n.universityIds;
      return n;
    });
  }

  function clearUniversities() {
    setSelectedUniIds(new Set());
    setFieldErrors((f) => {
      const n = { ...f };
      delete n.universityIds;
      return n;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const clientErr = validateConsultantForm(formSnapshot);
    if (Object.keys(clientErr).length > 0) {
      setFieldErrors(clientErr);
      return;
    }
    setFieldErrors({});
    setBusy(true);
    try {
      const res = await fetch("/api/master/consultants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password: password.trim() || undefined,
          universityIds: [...selectedUniIds],
          partnerRole,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: unknown;
      };
      if (!res.ok) {
        const apiFe = mapApiFieldErrors(data.fieldErrors);
        if (Object.keys(apiFe).length > 0) setFieldErrors(apiFe);
        setError(data.error ?? "Could not create admission partner");
        return;
      }
      router.push("/dashboard/master/consultants");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const uniSectionInvalid = Boolean(fieldErrors.universityIds);

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-5" noValidate>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Account type</label>
        <select
          value={partnerRole}
          disabled
          title="Account type is fixed to standard admission partner. Contact engineering for branch accounts."
          className="mt-1 w-full cursor-not-allowed rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2 text-[var(--foreground)] opacity-80"
        >
          <option value="consultant">Standard admission partner</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Name</label>
        <input
          type="text"
          inputMode="text"
          autoComplete="name"
          value={name}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\p{L} ]/gu, "");
            setName(v);
            setFieldErrors((f) => {
              const n = { ...f };
              delete n.name;
              return n;
            });
          }}
          className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${borderFor("name")}`}
          aria-invalid={Boolean(fieldErrors.name)}
        />
        {fieldErrors.name ? <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p> : null}
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Email</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldErrors((f) => {
              const n = { ...f };
              delete n.email;
              return n;
            });
          }}
          className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${borderFor("email")}`}
          aria-invalid={Boolean(fieldErrors.email)}
        />
        {fieldErrors.email ? <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p> : null}
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Phone number</label>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={10}
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
            setFieldErrors((f) => {
              const n = { ...f };
              delete n.phone;
              return n;
            });
          }}
          className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${borderFor("phone")}`}
          aria-invalid={Boolean(fieldErrors.phone)}
        />
        {fieldErrors.phone ? <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p> : null}
      </div>
      <div>
        <span className="block text-sm font-medium text-[var(--foreground)]">Assigned universities</span>
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">
          Select one, several, or all. Partners with multiple assignments can switch the active university in their hub.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAllUniversities}
            className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearUniversities}
            className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"
          >
            Clear
          </button>
        </div>
        <ul
          id="assigned-universities-list"
          aria-describedby={fieldErrors.universityIds ? "university-ids-error" : undefined}
          className={`mt-3 max-h-56 space-y-2 overflow-y-auto rounded-lg border bg-[var(--background)] p-3 ${
            uniSectionInvalid ? "border-red-500" : "border-[var(--border)]"
          }`}
        >
          {universities.length === 0 ? (
            <li className="text-sm text-[var(--foreground-muted)]">No universities available.</li>
          ) : (
            universities.map((u) => (
              <li key={u.id}>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={selectedUniIds.has(u.id)}
                    onChange={() => toggleUniversity(u.id)}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border)]"
                  />
                  <span>
                    {u.name}{" "}
                    <span className="text-xs text-[var(--foreground-muted)]">({u.code})</span>
                  </span>
                </label>
              </li>
            ))
          )}
        </ul>
        {fieldErrors.universityIds ? (
          <p id="university-ids-error" className="mt-1 text-xs text-red-600" role="alert">
            {fieldErrors.universityIds}
          </p>
        ) : null}
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--foreground)]">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setFieldErrors((f) => {
              const n = { ...f };
              delete n.password;
              return n;
            });
          }}
          placeholder="Leave blank to auto-generate"
          className={`mt-1 w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-[var(--foreground)] ${borderFor("password")}`}
          aria-invalid={Boolean(fieldErrors.password)}
        />
        <p className="mt-1 text-xs text-[var(--foreground-muted)]">Minimum 8 characters if set manually.</p>
        {fieldErrors.password ? <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p> : null}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={busy || !formValid}
        className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)] disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send email & create"}
      </button>
    </form>
  );
}
