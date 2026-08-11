import { db } from "@/lib/db";

/**
 * Loads a gallery only if it belongs to the given user. Never trust a
 * gallery/image id supplied by the client without this check.
 */
export async function requireGalleryOwner(galleryId: string, userId: string) {
  return db.gallery.findFirst({ where: { id: galleryId, userId } });
}

export async function requireImageOwner(imageId: string, userId: string) {
  const image = await db.image.findUnique({
    where: { id: imageId },
    select: { id: true, galleryId: true, gallery: { select: { userId: true } } },
  });
  if (!image || image.gallery.userId !== userId) return null;
  return image;
}
