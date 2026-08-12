import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { imageStorage } from "@/lib/storage/supabase-image-storage";
import { hasGalleryAccess } from "@/lib/gallery-access";

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

  let authorized = meta.gallery.isPublic || (await hasGalleryAccess(meta.gallery.id));
  if (!authorized) {
    const user = await getCurrentUser();
    if (user) {
      const owned = await db.gallery.findFirst({
        where: { id: meta.gallery.id, userId: user.id },
        select: { id: true },
      });
      authorized = !!owned;
    }
  }

  if (!authorized) {
    return NextResponse.json(
      { success: false, error: "You don't have permission to download this image." },
      { status: 403 }
    );
  }

  const target = await imageStorage.getDownloadUrl(id);
  if (!target) {
    return NextResponse.json({ success: false, error: "Image not found." }, { status: 404 });
  }

  // The presigned URL itself carries a Content-Disposition/Content-Type
  // override, so the original filename and correct type survive the
  // redirect without proxying bytes through this function.
  return NextResponse.redirect(target.url, {
    status: 302,
    headers: { "Cache-Control": "private, no-store" },
  });
}
