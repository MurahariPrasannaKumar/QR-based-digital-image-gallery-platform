import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { imageStorage } from "@/lib/storage/postgres-image-storage";
import { hasGalleryAccess } from "@/lib/gallery-access";
import { createZipBuffer, type ZipEntry } from "@/lib/zip";

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
    const session = await auth();
    authorized = session?.user?.id === gallery.userId;
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

  const entries: ZipEntry[] = [];
  for (const meta of images) {
    const full = await imageStorage.getImage(meta.id);
    if (!full) continue; // skip missing/corrupt images rather than failing the whole archive
    entries.push({ filename: full.originalName, data: full.data });
  }

  if (entries.length === 0) {
    return NextResponse.json(
      { success: false, error: "No images could be prepared for download." },
      { status: 500 }
    );
  }

  const zipBuffer = await createZipBuffer(entries);
  const zipFilename = `${gallery.name.replace(/[^a-z0-9-_ ]/gi, "").trim() || "gallery"}.zip`;

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(zipFilename)}"`,
    },
  });
}
