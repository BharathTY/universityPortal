import bcrypt from "bcryptjs";

const OTP_SALT_ROUNDS = 10;

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function hashOtp(plain: string): Promise<string> {
  return bcrypt.hash(plain, OTP_SALT_ROUNDS);
}

export async function verifyOtp(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
