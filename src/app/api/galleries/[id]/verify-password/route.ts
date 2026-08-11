import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPublicGalleryBySlug } from "@/lib/public-gallery";
import { grantGalleryAccess } from "@/lib/gallery-access";
import { verifyPasswordSchema } from "@/lib/validations";

// The dynamic segment is named `id` to match sibling routes under
// /api/galleries/[id]/*, but the value passed here is the gallery's
// public slug (visitors never see the internal gallery id).
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: slug } = await ctx.params;
  const gallery = await getPublicGalleryBySlug(slug);

  if (!gallery) {
    return NextResponse.json({ success: false, error: "Gallery not found." }, { status: 404 });
  }

  if (gallery.isPublic || !gallery.passwordHash) {
    return NextResponse.json({ success: true });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = verifyPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Password is required." }, { status: 400 });
  }

  const valid = await bcrypt.compare(parsed.data.password, gallery.passwordHash);
  if (!valid) {
    return NextResponse.json({ success: false, error: "Incorrect password." }, { status: 401 });
  }

  await grantGalleryAccess(gallery.id);
  return NextResponse.json({ success: true });
}
