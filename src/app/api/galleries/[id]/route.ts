import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { requireGalleryOwner } from "@/lib/authorize";
import { getOwnedGallery } from "@/lib/galleries";
import { updateGallerySchema } from "@/lib/validations";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const gallery = await getOwnedGallery(id, session.user.id);
  if (!gallery) {
    return NextResponse.json({ success: false, error: "Gallery not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: gallery });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const owned = await requireGalleryOwner(id, session.user.id);
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
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const owned = await requireGalleryOwner(id, session.user.id);
  if (!owned) {
    return NextResponse.json(
      { success: false, error: "You don't have permission to perform this action." },
      { status: 403 }
    );
  }

  await db.gallery.delete({ where: { id } });

  return NextResponse.json({ success: true, data: { id } });
}
