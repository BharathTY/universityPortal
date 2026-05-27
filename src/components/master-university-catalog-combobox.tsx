"use client";

import * as React from "react";

export type MasterCatalogItem = {
  id: string;
  name: string;
  state: string;
  district: string;
  address: string | null;
  city: string | null;
  pincode: string | null;
  website: string | null;
  universityType: string;
};

type MasterUniversityCatalogComboboxProps = {
  value: MasterCatalogItem | null;
  onChange: (item: MasterCatalogItem) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
  /** Panel opens above the trigger (matches onboard mockup). */
  openUp?: boolean;
};

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

async function fetchCatalog(q: string, limit = 50): Promise<MasterCatalogItem[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (q.trim()) params.set("q", q.trim());
  const res = await fetch(`/api/master/master-universities/search?${params}`);
  const data = (await res.json().catch(() => ({}))) as { items?: MasterCatalogItem[] };
  return data.items ?? [];
}

export function MasterUniversityCatalogCombobox({
  value,
  onChange,
  disabled,
  error,
  placeholder = "Choose from catalog…",
  openUp = true,
}: MasterUniversityCatalogComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [items, setItems] = React.useState<MasterCatalogItem[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(0);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    setSearch("");
    setHighlightIndex(0);
    setBusy(true);
    void fetchCatalog("")
      .then(setItems)
      .finally(() => setBusy(false));
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setBusy(true);
      void fetchCatalog(search)
        .then((next) => {
          setItems(next);
          setHighlightIndex(0);
        })
        .finally(() => setBusy(false));
    }, 250);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [open, search]);

  React.useEffect(() => {
    if (!open) return;
    function onDocPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(item: MasterCatalogItem) {
    onChange(item);
    setOpen(false);
    setSearch("");
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && items[highlightIndex]) {
      e.preventDefault();
      pick(items[highlightIndex]!);
    }
  }

  const panelPosition = openUp ? "bottom-full mb-1.5" : "top-full mt-1.5";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-[var(--background)] px-3 py-2.5 text-left text-sm transition-colors ${
          error ? "border-red-500" : "border-[var(--border)]"
        } ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-emerald-600/40"}`}
      >
        <span className={value ? "font-medium text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}>
          {value?.name ?? placeholder}
        </span>
        <ChevronDown className="shrink-0 text-[var(--foreground-muted)]" />
      </button>

      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}

      {open ? (
        <div
          className={`absolute ${panelPosition} left-0 z-50 w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl`}
          role="presentation"
        >
          <div className="border-b border-[var(--border)] p-2">
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search universities…"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-emerald-600/50 focus:ring-2 focus:ring-emerald-600/15"
              autoComplete="off"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1" role="listbox" aria-label="University catalog">
            {busy && items.length === 0 ? (
              <li className="px-3 py-3 text-sm text-[var(--foreground-muted)]">Loading…</li>
            ) : items.length === 0 ? (
              <li className="px-3 py-3 text-sm text-[var(--foreground-muted)]">
                {search.trim() ? "No universities match your search." : "No universities in catalog."}
              </li>
            ) : (
              items.map((item, index) => {
                const selected = value?.id === item.id;
                const highlighted = index === highlightIndex;
                return (
                  <li key={item.id} role="option" aria-selected={selected}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => pick(item)}
                      className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                        selected || highlighted
                          ? "bg-emerald-100/90 text-[var(--foreground)] dark:bg-emerald-900/30"
                          : "text-[var(--foreground)] hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                      }`}
                    >
                      {item.name}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
