import { db } from "@/lib/db";

export async function getPublicGalleryBySlug(slug: string) {
  const gallery = await db.gallery.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      description: true,
      slug: true,
      isPublic: true,
      passwordHash: true,
      _count: { select: { images: true } },
    },
  });
  if (!gallery) return null;

  return {
    id: gallery.id,
    name: gallery.name,
    description: gallery.description,
    slug: gallery.slug,
    isPublic: gallery.isPublic,
    hasPassword: !!gallery.passwordHash,
    passwordHash: gallery.passwordHash,
    imageCount: gallery._count.images,
  };
}
