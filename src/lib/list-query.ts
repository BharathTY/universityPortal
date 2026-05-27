import type { Prisma } from "@prisma/client";

export type ListSortLatest = "latest" | "oldest";
export type ListSortName = "name" | "name-desc";

export function parsePage(value: string | undefined, defaultPage = 1): number {
  return Math.max(1, Number(value ?? String(defaultPage)) || defaultPage);
}

export function parsePageSize(value: string | undefined, defaultSize = 25, max = 100): number {
  return Math.min(max, Math.max(5, Number(value ?? String(defaultSize)) || defaultSize));
}

export function paginationMeta(total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return { total, page: safePage, pageSize, totalPages, skip: (safePage - 1) * pageSize };
}

export function searchParamOne(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const raw = sp[key];
  if (Array.isArray(raw)) return raw[0]?.trim() || undefined;
  return raw?.trim() || undefined;
}

/** Text search across lead name, email, mobile. */
export function leadTextSearchWhere(q: string | undefined): Prisma.AdmissionLeadWhereInput | undefined {
  const term = q?.trim();
  if (!term) return undefined;
  return {
    OR: [
      { firstName: { contains: term, mode: "insensitive" } },
      { lastName: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { mobile: { contains: term, mode: "insensitive" } },
    ],
  };
}

export function leadOrderBy(sort: string | undefined): Prisma.AdmissionLeadOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "name":
      return { firstName: "asc" };
    case "name-desc":
      return { firstName: "desc" };
    case "email":
      return { email: "asc" };
    default:
      return { createdAt: "desc" };
  }
}

/** Text search across user name, email, phone, company. */
export function userTextSearchWhere(q: string | undefined): Prisma.UserWhereInput | undefined {
  const term = q?.trim();
  if (!term) return undefined;
  return {
    OR: [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      { companyName: { contains: term, mode: "insensitive" } },
    ],
  };
}

export function userOrderBy(sort: string | undefined): Prisma.UserOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "name":
      return { name: "asc" };
    case "name-desc":
      return { name: "desc" };
    case "email-desc":
      return { email: "desc" };
    default:
      return { createdAt: "desc" };
  }
}

/** Text search for university name, code, email. */
export function universityTextSearchWhere(q: string | undefined): Prisma.UniversityWhereInput | undefined {
  const term = q?.trim();
  if (!term) return undefined;
  return {
    OR: [
      { name: { contains: term, mode: "insensitive" } },
      { code: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
    ],
  };
}

export function universityOrderBy(sort: string | undefined): Prisma.UniversityOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "name":
      return { name: "asc" };
    case "name-desc":
      return { name: "desc" };
    case "code":
      return { code: "asc" };
    default:
      return { createdAt: "desc" };
  }
}

/** Text search for applications by student or reference. */
export function applicationTextSearchWhere(q: string | undefined): Prisma.ApplicationWhereInput | undefined {
  const term = q?.trim();
  if (!term) return undefined;
  return {
    OR: [
      { referenceCode: { contains: term, mode: "insensitive" } },
      { user: { name: { contains: term, mode: "insensitive" } } },
      { user: { email: { contains: term, mode: "insensitive" } } },
      { user: { phone: { contains: term, mode: "insensitive" } } },
      { university: { name: { contains: term, mode: "insensitive" } } },
    ],
  };
}

export function applicationOrderBy(sort: string | undefined): Prisma.ApplicationOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "student":
      return { user: { name: "asc" } };
    case "university":
      return { university: { name: "asc" } };
    default:
      return { createdAt: "desc" };
  }
}

export function paymentTextSearchWhere(q: string | undefined): Prisma.LeadPaymentWhereInput | undefined {
  const term = q?.trim();
  if (!term) return undefined;
  return {
    OR: [
      { transactionRef: { contains: term, mode: "insensitive" } },
      { lead: { firstName: { contains: term, mode: "insensitive" } } },
      { lead: { lastName: { contains: term, mode: "insensitive" } } },
      { lead: { email: { contains: term, mode: "insensitive" } } },
      { lead: { university: { name: { contains: term, mode: "insensitive" } } } },
    ],
  };
}
