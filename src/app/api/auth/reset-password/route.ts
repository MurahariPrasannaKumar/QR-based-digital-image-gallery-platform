import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validations";
import { consumeVerificationToken } from "@/lib/verification-tokens";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const record = await consumeVerificationToken(parsed.data.token, "PASSWORD_RESET");
  if (!record) {
    return NextResponse.json(
      { success: false, error: "This link is invalid or has expired." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await db.user.updateMany({
    where: { email: record.identifier },
    data: { passwordHash },
  });

  return NextResponse.json({ success: true });
}
