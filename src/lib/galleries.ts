import { db } from "@/lib/db";
import type { GallerySummary } from "@/types/gallery";

const GALLERY_LIST_SELECT = {
  id: true,
  name: true,
  description: true,
  slug: true,
  isPublic: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { images: true } },
  images: {
    select: { id: true },
    orderBy: { sortOrder: "asc" as const },
    take: 1,
  },
} as const;

type RawGallery = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isPublic: boolean;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { images: number };
  images: { id: string }[];
};

function toSummary(gallery: RawGallery): GallerySummary {
  return {
    id: gallery.id,
    name: gallery.name,
    description: gallery.description,
    slug: gallery.slug,
    isPublic: gallery.isPublic,
    hasPassword: !!gallery.passwordHash,
    imageCount: gallery._count.images,
    coverImageId: gallery.images[0]?.id ?? null,
    createdAt: gallery.createdAt.toISOString(),
    updatedAt: gallery.updatedAt.toISOString(),
  };
}

export async function listGalleriesForUser(userId: string): Promise<GallerySummary[]> {
  const galleries = await db.gallery.findMany({
    where: { userId },
    select: GALLERY_LIST_SELECT,
    orderBy: { createdAt: "desc" },
  });
  return galleries.map(toSummary);
}

export async function getOwnedGallery(galleryId: string, userId: string) {
  const gallery = await db.gallery.findFirst({
    where: { id: galleryId, userId },
    select: GALLERY_LIST_SELECT,
  });
  if (!gallery) return null;
  return toSummary(gallery);
}

export async function getDashboardStats(userId: string) {
  const [galleryCount, imageCount] = await Promise.all([
    db.gallery.count({ where: { userId } }),
    db.image.count({ where: { gallery: { userId } } }),
  ]);
  return { galleryCount, imageCount };
}
