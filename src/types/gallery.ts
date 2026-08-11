export interface GallerySummary {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isPublic: boolean;
  hasPassword: boolean;
  imageCount: number;
  coverImageId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GalleryDetail extends GallerySummary {
  userId: string;
}
