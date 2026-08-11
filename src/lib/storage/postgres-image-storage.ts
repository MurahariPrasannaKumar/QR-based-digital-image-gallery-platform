import { db } from "@/lib/db";
import type {
  ImageStorage,
  ImageMetadata,
  ImageWithData,
  SaveImageInput,
} from "@/lib/storage/image-storage";

const METADATA_SELECT = {
  id: true,
  galleryId: true,
  originalName: true,
  mimeType: true,
  fileSize: true,
  width: true,
  height: true,
  sortOrder: true,
  createdAt: true,
} as const;

class PostgresImageStorage implements ImageStorage {
  async saveImage(input: SaveImageInput): Promise<ImageMetadata> {
    return db.image.create({
      data: {
        galleryId: input.galleryId,
        originalName: input.originalName,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        data: new Uint8Array(input.data),
        width: input.width ?? null,
        height: input.height ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
      select: METADATA_SELECT,
    });
  }

  async getImage(id: string): Promise<ImageWithData | null> {
    const image = await db.image.findUnique({
      where: { id },
      select: { ...METADATA_SELECT, data: true },
    });
    if (!image) return null;
    return { ...image, data: Buffer.from(image.data) };
  }

  async deleteImage(id: string): Promise<void> {
    await db.image.delete({ where: { id } });
  }

  async getGalleryImages(galleryId: string): Promise<ImageMetadata[]> {
    return db.image.findMany({
      where: { galleryId },
      select: METADATA_SELECT,
      orderBy: { sortOrder: "asc" },
    });
  }
}

export const imageStorage: ImageStorage = new PostgresImageStorage();
