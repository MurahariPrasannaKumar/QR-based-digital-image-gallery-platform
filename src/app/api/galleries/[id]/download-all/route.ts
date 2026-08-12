import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { imageStorage } from "@/lib/storage/supabase-image-storage";
import { hasGalleryAccess } from "@/lib/gallery-access";
import { createZipStream, type ZipStreamEntry } from "@/lib/zip";

// The dynamic segment is named `id` to match sibling routes, but the
// value here is the gallery's public slug (used from the public gallery page).
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: slug } = await ctx.params;

  const gallery = await db.gallery.findUnique({
    where: { slug },
    select: { id: true, name: true, isPublic: true, passwordHash: true, userId: true },
  });
  if (!gallery) {
    return NextResponse.json({ success: false, error: "Gallery not found." }, { status: 404 });
  }

  let authorized = gallery.isPublic || (await hasGalleryAccess(gallery.id));
  if (!authorized) {
    const user = await getCurrentUser();
    authorized = user?.id === gallery.userId;
  }
  if (!authorized) {
    return NextResponse.json(
      { success: false, error: "You don't have permission to download this gallery." },
      { status: 403 }
    );
  }

  const images = await imageStorage.getGalleryImages(gallery.id);
  if (images.length === 0) {
    return NextResponse.json({ success: false, error: "This gallery has no images." }, { status: 400 });
  }

  const streams = await Promise.all(images.map((meta) => imageStorage.getObjectStream(meta.id)));

  const entries: ZipStreamEntry[] = [];
  for (const obj of streams) {
    if (!obj) continue; // skip missing/corrupt images rather than failing the whole archive
    entries.push({ filename: obj.originalName, stream: obj.stream });
  }

  if (entries.length === 0) {
    return NextResponse.json(
      { success: false, error: "No images could be prepared for download." },
      { status: 500 }
    );
  }

  const zipStream = createZipStream(entries);
  const zipFilename = `${gallery.name.replace(/[^a-z0-9-_ ]/gi, "").trim() || "gallery"}.zip`;

  return new NextResponse(Readable.toWeb(zipStream) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(zipFilename)}"`,
    },
  });
}
