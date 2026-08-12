import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { requireGalleryOwner } from "@/lib/authorize";
import { getOwnedGallery } from "@/lib/galleries";
import { updateGallerySchema } from "@/lib/validations";
import { imageStorage } from "@/lib/storage/supabase-image-storage";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const gallery = await getOwnedGallery(id, user.id);
  if (!gallery) {
    return NextResponse.json({ success: false, error: "Gallery not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: gallery });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const owned = await requireGalleryOwner(id, user.id);
  if (!owned) {
    return NextResponse.json(
      { success: false, error: "You don't have permission to perform this action." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = updateGallerySchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const { name, description, isPublic, password } = parsed.data;
  const nextIsPublic = isPublic ?? owned.isPublic;

  let passwordHash = owned.passwordHash;
  if (nextIsPublic) {
    passwordHash = null;
  } else if (password) {
    passwordHash = await bcrypt.hash(password, 12);
  } else if (isPublic === false && !owned.passwordHash) {
    return NextResponse.json(
      { success: false, error: "Set a password to protect this gallery." },
      { status: 400 }
    );
  }

  const gallery = await db.gallery.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      isPublic: nextIsPublic,
      passwordHash,
    },
    select: { id: true, slug: true },
  });

  return NextResponse.json({ success: true, data: gallery });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const owned = await requireGalleryOwner(id, user.id);
  if (!owned) {
    return NextResponse.json(
      { success: false, error: "You don't have permission to perform this action." },
      { status: 403 }
    );
  }

  // Purge R2 objects first — if this fails partway, we still proceed with
  // the DB delete rather than leaving a gallery the owner can't get rid of;
  // any objects that failed to delete are logged and become orphans.
  await imageStorage.deleteGalleryObjects(id);
  await db.gallery.delete({ where: { id } });

  return NextResponse.json({ success: true, data: { id } });
}
