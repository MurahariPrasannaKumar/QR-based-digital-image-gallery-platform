export interface SaveImageInput {
  galleryId: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  data: Buffer;
  width?: number | null;
  height?: number | null;
  sortOrder?: number;
}

export interface ImageMetadata {
  id: string;
  galleryId: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  sortOrder: number;
  createdAt: Date;
}

export interface ImageWithData extends ImageMetadata {
  data: Buffer;
}

export interface ImageStorage {
  saveImage(input: SaveImageInput): Promise<ImageMetadata>;
  getImage(id: string): Promise<ImageWithData | null>;
  deleteImage(id: string): Promise<void>;
  getGalleryImages(galleryId: string): Promise<ImageMetadata[]>;
}
