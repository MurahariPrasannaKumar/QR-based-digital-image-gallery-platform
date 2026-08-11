import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validations";
import { createVerificationToken } from "@/lib/verification-tokens";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });

  // Always respond with success, whether or not the account exists — this
  // avoids leaking which emails are registered.
  if (user) {
    try {
      const token = await createVerificationToken(email, "PASSWORD_RESET");
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
      await sendPasswordResetEmail(email, resetUrl);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }
  }

  return NextResponse.json({
    success: true,
    data: { message: "If an account exists for that email, a reset link has been sent." },
  });
}
