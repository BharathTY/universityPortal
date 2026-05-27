"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

export type SortOption = { value: string; label: string };

export const SORT_LATEST: SortOption[] = [
  { value: "latest", label: "Latest first" },
  { value: "oldest", label: "Oldest first" },
];

export const SORT_LEADS: SortOption[] = [
  ...SORT_LATEST,
  { value: "name", label: "Name (A–Z)" },
  { value: "email", label: "Email (A–Z)" },
];

export const SORT_USERS: SortOption[] = [
  ...SORT_LATEST,
  { value: "name", label: "Name (A–Z)" },
  { value: "email-desc", label: "Email (Z–A)" },
];

export const SORT_UNIVERSITIES: SortOption[] = [
  ...SORT_LATEST,
  { value: "name", label: "Name (A–Z)" },
  { value: "code", label: "Code (A–Z)" },
];

export const SORT_APPLICATIONS: SortOption[] = [
  ...SORT_LATEST,
  { value: "student", label: "Student name" },
  { value: "university", label: "University" },
];

type ListQueryToolbarProps = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  q?: string;
  sort?: string;
  sortOptions?: SortOption[];
  searchPlaceholder?: string;
  showSearch?: boolean;
  showSort?: boolean;
  showPageSize?: boolean;
  loading?: boolean;
  itemLabel?: string;
  className?: string;
};

export function ListQueryToolbar({
  total,
  page,
  pageSize,
  totalPages,
  q = "",
  sort = "latest",
  sortOptions = SORT_LATEST,
  searchPlaceholder = "Search…",
  showSearch = true,
  showSort = true,
  showPageSize = true,
  loading = false,
  itemLabel = "result",
  className = "",
}: ListQueryToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(q);

  React.useEffect(() => {
    setSearch(q);
  }, [q]);

  function navigate(patch: Record<string, string | number | undefined | null>) {
    const p = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === null || value === "") {
        p.delete(key);
      } else if (key === "page" && Number(value) <= 1) {
        p.delete(key);
      } else if (key === "pageSize" && Number(value) === 25) {
        p.delete(key);
      } else if (key === "sort" && value === "latest") {
        p.delete(key);
      } else {
        p.set(key, String(value));
      }
    }
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ q: search.trim() || undefined, page: 1 });
  }

  const plural = total === 1 ? itemLabel : `${itemLabel}s`;

  return (
    <div className={`space-y-4 ${className}`}>
      {(showSearch || showSort) && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          {showSearch ? (
            <form onSubmit={onSearchSubmit} className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="list-search" className="text-xs font-medium text-[var(--foreground-muted)]">
                  Search
                </label>
                <input
                  id="list-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                Search
              </button>
            </form>
          ) : null}
          {showSort && sortOptions.length > 0 ? (
            <div className="w-full sm:w-48">
              <label htmlFor="list-sort" className="text-xs font-medium text-[var(--foreground-muted)]">
                Sort
              </label>
              <select
                id="list-sort"
                value={sort}
                disabled={loading}
                onChange={(e) => navigate({ sort: e.target.value, page: 1 })}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-[var(--foreground-muted)]">
          {loading ? "Loading…" : `${total} ${plural}${totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {showPageSize ? (
            <label className="flex items-center gap-2 text-[var(--foreground-muted)]">
              Rows
              <select
                value={pageSize}
                disabled={loading}
                onChange={(e) => navigate({ pageSize: Number(e.target.value), page: 1 })}
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm text-[var(--foreground)]"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {totalPages > 1 ? (
            <>
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => navigate({ page: page - 1 })}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 font-medium disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => navigate({ page: page + 1 })}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 font-medium disabled:opacity-50"
              >
                Next
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Client-side filter for lists already loaded on the server (e.g. seats). */
export function ClientFilteredTable<T>({
  rows,
  filterKeys,
  searchPlaceholder = "Filter…",
  pageSize: defaultPageSize = 25,
  renderTable,
  itemLabel = "row",
}: {
  rows: T[];
  filterKeys: (row: T, q: string) => boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  itemLabel?: string;
  renderTable: (visible: T[]) => React.ReactNode;
}) {
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);
  const [sort, setSort] = React.useState("latest");

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = term ? rows.filter((r) => filterKeys(r, term)) : [...rows];
    if (sort === "name") {
      list = [...list].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }
    return list;
  }, [rows, q, sort, filterKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  React.useEffect(() => {
    setPage(1);
  }, [q, pageSize, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="text-xs font-medium text-[var(--foreground-muted)]">Search</label>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchPlaceholder}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="text-xs font-medium text-[var(--foreground-muted)]">Sort</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"
          >
            <option value="latest">Default order</option>
            <option value="name">Match text</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--foreground-muted)]">
        <span>
          {filtered.length} {filtered.length === 1 ? itemLabel : `${itemLabel}s`}
          {totalPages > 1 ? ` · page ${safePage} of ${totalPages}` : ""}
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2">
            Rows
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          {totalPages > 1 ? (
            <>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-[var(--border)] px-3 py-1 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-[var(--border)] px-3 py-1 disabled:opacity-50"
              >
                Next
              </button>
            </>
          ) : null}
        </div>
      </div>
      {renderTable(visible)}
    </div>
  );
}
