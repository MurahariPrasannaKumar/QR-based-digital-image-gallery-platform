import crypto from "crypto";
import { db } from "@/lib/db";
import type { VerificationTokenType } from "@/generated/prisma/enums";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function createVerificationToken(
  identifier: string,
  type: VerificationTokenType
): Promise<string> {
  // Invalidate any outstanding tokens of the same type for this email first.
  await db.verificationToken.deleteMany({ where: { identifier, type } });

  const token = crypto.randomBytes(32).toString("hex");
  const ttl = type === "PASSWORD_RESET" ? PASSWORD_RESET_TTL_MS : EMAIL_VERIFICATION_TTL_MS;

  await db.verificationToken.create({
    data: { identifier, token, type, expires: new Date(Date.now() + ttl) },
  });

  return token;
}

export async function consumeVerificationToken(token: string, type: VerificationTokenType) {
  const record = await db.verificationToken.findUnique({ where: { token } });
  if (!record || record.type !== type) return null;

  await db.verificationToken.delete({ where: { token } });

  if (record.expires < new Date()) return null;

  return record;
}
