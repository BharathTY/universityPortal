import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";

type Db = Pick<typeof prisma, "user"> | Prisma.TransactionClient;

/**
 * The university portal login account is created last during university setup.
 * SPOC sub-accounts with the same role are created earlier — do not use asc order.
 */
export async function findUniversityPrimaryLoginUser(db: Db, universityId: string) {
  return db.user.findFirst({
    where: {
      universityId,
      roles: { some: { role: { slug: ROLES.university } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export const UNIVERSITY_EMAIL_IN_USE_MESSAGE = "Email is already in use";

export class UniversityEmailInUseError extends Error {
  constructor() {
    super("Email is already in use by another account");
    this.name = "UniversityEmailInUseError";
  }
}

/**
 * Returns true when the email can be used for a university contact / primary login.
 * Pass excludeUniversityId when editing so the university's own email is allowed.
 */
export async function isUniversityEmailAvailable(
  email: string,
  options?: {
    excludeUniversityId?: string;
    currentUniversityEmail?: string | null;
  },
): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  if (!normalized) return true;

  if (
    options?.excludeUniversityId &&
    normalized === (options.currentUniversityEmail?.toLowerCase().trim() ?? null)
  ) {
    return true;
  }

  const [clashUser, clashUni] = await Promise.all([
    prisma.user.findUnique({ where: { email: normalized } }),
    prisma.university.findFirst({
      where: {
        email: normalized,
        ...(options?.excludeUniversityId
          ? { NOT: { id: options.excludeUniversityId } }
          : {}),
      },
    }),
  ]);

  if (clashUni) return false;

  if (clashUser) {
    if (options?.excludeUniversityId) {
      const primary = await findUniversityPrimaryLoginUser(prisma, options.excludeUniversityId);
      if (primary && clashUser.id === primary.id) return true;
    }
    return false;
  }

  return true;
}

/** Sync name / phone / email to the primary university login user after university update. */
export async function syncUniversityPrimaryLoginUser(
  tx: Prisma.TransactionClient,
  universityId: string,
  patch: { email?: string | null; phone?: string; name?: string },
) {
  const primary = await findUniversityPrimaryLoginUser(tx, universityId);
  if (!primary) return;

  const data: Prisma.UserUpdateInput = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.phone !== undefined) data.phone = patch.phone;

  if (patch.email !== undefined) {
    const next = patch.email?.toLowerCase().trim() ?? null;
    if (next && next !== primary.email) {
      const clash = await tx.user.findUnique({ where: { email: next } });
      if (clash && clash.id !== primary.id) {
        throw new UniversityEmailInUseError();
      }
      data.email = next;
    }
  }

  if (Object.keys(data).length === 0) return;
  await tx.user.update({ where: { id: primary.id }, data });
}

/** Pre-transaction check before changing university contact email. */
export async function assertUniversityEmailAvailable(
  universityId: string,
  email: string,
  currentUniversityEmail: string | null,
) {
  const available = await isUniversityEmailAvailable(email, {
    excludeUniversityId: universityId,
    currentUniversityEmail,
  });
  if (!available) {
    throw new UniversityEmailInUseError();
  }
}
