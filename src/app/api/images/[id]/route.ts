import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { imageStorage } from "@/lib/storage/r2-image-storage";
import { hasGalleryAccess } from "@/lib/gallery-access";
import { requireImageOwner } from "@/lib/authorize";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const meta = await db.image.findUnique({
    where: { id },
    select: {
      gallery: { select: { id: true, isPublic: true, passwordHash: true, userId: true } },
    },
  });
  if (!meta) {
    return NextResponse.json({ success: false, error: "Image not found." }, { status: 404 });
  }

  const authorized = await isAuthorizedForGallery(meta.gallery);
  if (!authorized) {
    return NextResponse.json(
      { success: false, error: "You don't have permission to view this image." },
      { status: 403 }
    );
  }

  const url = await imageStorage.getViewUrl(id);
  if (!url) {
    return NextResponse.json({ success: false, error: "Image not found." }, { status: 404 });
  }

  // Redirect rather than proxy — the actual bytes are served straight from
  // R2 (or its CDN edge, for the public-URL fast path), not through this
  // function. Short-lived signed URLs are never cached by shared caches.
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const owned = await requireImageOwner(id, session.user.id);
  if (!owned) {
    return NextResponse.json(
      { success: false, error: "You don't have permission to perform this action." },
      { status: 403 }
    );
  }

  await imageStorage.deleteImage(id);
  return NextResponse.json({ success: true, data: { id } });
}

async function isAuthorizedForGallery(gallery: {
  id: string;
  isPublic: boolean;
  passwordHash: string | null;
}) {
  if (gallery.isPublic) return true;
  if (await hasGalleryAccess(gallery.id)) return true;

  const session = await auth();
  if (!session?.user) return false;

  const owned = await db.gallery.findFirst({
    where: { id: gallery.id, userId: session.user.id },
    select: { id: true },
  });
  return !!owned;
}
