"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export type InviteUniOption = { id: string; name: string; code: string };

export function InviteCounsellorsTrigger({ universities }: { universities: InviteUniOption[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => universities.map((u) => u.id));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSelectedIds(universities.map((u) => u.id));
  }, [universities]);

  function toggleUni(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (selectedIds.length === 0) {
      setError("Select at least one university.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/consultant/invite-counsellor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim(),
          phone: phone.trim(),
          password: password,
          universityIds: selectedIds,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not send invite");
        return;
      }
      setOpen(false);
      setEmail("");
      setName("");
      setPhone("");
      setPassword("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--accent-blue-hover)]"
      >
        Invite Consultant SPOC
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close invite panel"
            onClick={() => !busy && setOpen(false)}
          />
          <div
            className="relative flex h-full w-full max-w-md flex-col border-l border-zinc-200 bg-white text-zinc-900 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-spoc-title"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4">
              <h2 id="invite-spoc-title" className="text-lg font-semibold text-zinc-900">
                Invite Consultant SPOC
              </h2>
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100"
              >
                Close
              </button>
            </div>
            <form onSubmit={(e) => void onSend(e)} className="flex flex-1 flex-col overflow-y-auto bg-white px-5 py-4">
              <p className="text-sm text-zinc-600">
                Set a password for the Consultant SPOC. We email their login details so they can sign in right away.
              </p>
              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="c-inv-email" className="text-sm font-medium text-zinc-900">
                    Consultant SPOC email
                  </label>
                  <input
                    id="c-inv-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-blue-500 focus:ring-2"
                  />
                </div>
                <div>
                  <label htmlFor="c-inv-name" className="text-sm font-medium text-zinc-900">
                    Consultant SPOC name
                  </label>
                  <input
                    id="c-inv-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-blue-500 focus:ring-2"
                  />
                </div>
                <div>
                  <label htmlFor="c-inv-phone" className="text-sm font-medium text-zinc-900">
                    Phone number
                  </label>
                  <input
                    id="c-inv-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-blue-500 focus:ring-2"
                  />
                </div>
                <div>
                  <label htmlFor="c-inv-password" className="text-sm font-medium text-zinc-900">
                    Password
                  </label>
                  <input
                    id="c-inv-password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-blue-500 focus:ring-2"
                  />
                  <p className="mt-1 text-xs text-zinc-600">At least 8 characters. Included in the invitation email.</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">Universities</p>
                  <p className="mt-0.5 text-xs text-zinc-600">Select one or more.</p>
                  <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3">
                    {universities.map((u) => (
                      <li key={u.id}>
                        <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-900">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(u.id)}
                            onChange={() => toggleUni(u.id)}
                            className="mt-1 rounded border-zinc-300"
                          />
                          <span>
                            {u.name} <span className="text-zinc-600">({u.code})</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {error ? (
                <p className="mt-4 text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="mt-auto border-t border-zinc-200 bg-white pt-4">
                <button
                  type="submit"
                  disabled={busy || universities.length === 0}
                  className="w-full rounded-lg bg-[var(--accent-blue)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-blue-hover)] disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
