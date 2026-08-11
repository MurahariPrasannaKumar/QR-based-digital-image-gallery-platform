import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createVerificationToken } from "@/lib/verification-tokens";
import { sendVerificationEmail } from "@/lib/mailer";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true },
  });
  if (!user) {
    return NextResponse.json({ success: false, error: "Account not found." }, { status: 404 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ success: true, data: { alreadyVerified: true } });
  }

  const token = await createVerificationToken(user.email, "EMAIL_VERIFICATION");
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;

  try {
    await sendVerificationEmail(user.email, verifyUrl);
  } catch (err) {
    console.error("Failed to send verification email:", err);
    return NextResponse.json(
      { success: false, error: "Failed to send email. Please try again later." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: { alreadyVerified: false } });
}
