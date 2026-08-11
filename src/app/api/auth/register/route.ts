import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations";
import { createVerificationToken } from "@/lib/verification-tokens";
import { sendVerificationEmail } from "@/lib/mailer";
import { RATE_LIMITS } from "@/lib/constants";
import { rateLimit, getClientIp, rateLimitResponseInit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const [limit, windowMs] = RATE_LIMITS.register;
  const limitResult = rateLimit(`register:${getClientIp(req)}`, limit, windowMs);
  if (!limitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Please try again later." },
      rateLimitResponseInit(limitResult)
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
    },
    select: { id: true, name: true, email: true },
  });

  try {
    const token = await createVerificationToken(email, "EMAIL_VERIFICATION");
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
    await sendVerificationEmail(email, verifyUrl);
  } catch (err) {
    // Don't fail registration if the email couldn't be sent — the user can
    // still request a new verification email later from settings.
    console.error("Failed to send verification email:", err);
  }

  return NextResponse.json({ success: true, data: user }, { status: 201 });
}
