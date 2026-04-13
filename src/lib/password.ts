import bcrypt from "bcryptjs";

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

/** URL-safe readable password for new accounts. */
export function generateRandomPassword(length = 14): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%";
  const all = upper + lower + digits + special;
  const out: string[] = [];
  out.push(upper[Math.floor(Math.random() * upper.length)]!);
  out.push(lower[Math.floor(Math.random() * lower.length)]!);
  out.push(digits[Math.floor(Math.random() * digits.length)]!);
  out.push(special[Math.floor(Math.random() * special.length)]!);
  for (let i = out.length; i < length; i++) {
    out.push(all[Math.floor(Math.random() * all.length)]!);
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out.join("");
}
