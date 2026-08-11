import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { imageStorage } from "@/lib/storage/postgres-image-storage";
import { hasGalleryAccess } from "@/lib/gallery-access";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const meta = await db.image.findUnique({
    where: { id },
    select: {
      originalName: true,
      gallery: { select: { id: true, isPublic: true, passwordHash: true, userId: true } },
    },
  });
  if (!meta) {
    return NextResponse.json({ success: false, error: "Image not found." }, { status: 404 });
  }

  let authorized = meta.gallery.isPublic || (await hasGalleryAccess(meta.gallery.id));
  if (!authorized) {
    const session = await auth();
    if (session?.user) {
      const owned = await db.gallery.findFirst({
        where: { id: meta.gallery.id, userId: session.user.id },
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

  const image = await imageStorage.getImage(id);
  if (!image) {
    return NextResponse.json({ success: false, error: "Image not found." }, { status: 404 });
  }

  const filename = encodeURIComponent(meta.originalName);

  return new NextResponse(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
    },
  });
}
