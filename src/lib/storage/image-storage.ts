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

export interface CreateUploadTargetInput {
  galleryId: string;
  mimeType: string;
  fileSize: number;
}

export interface UploadTarget {
  /** Opaque object key the browser will upload to and the DB will reference. */
  storageKey: string;
  /** Presigned PUT URL — the browser uploads bytes directly here. */
  uploadUrl: string;
  expiresInSeconds: number;
}

export interface ConfirmUploadInput {
  galleryId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  sortOrder?: number;
}

export interface DownloadTarget {
  url: string;
  originalName: string;
}

export interface ImageObjectStream {
  stream: import("stream").Readable;
  mimeType: string;
  fileSize: number;
  originalName: string;
}

export interface ImageStorage {
  /** Direct server-side write (used by data-migration tooling). */
  saveImage(input: SaveImageInput): Promise<ImageMetadata>;
  /** Direct server-side read as a Buffer. Prefer getObjectStream() for large files. */
  getImage(id: string): Promise<ImageWithData | null>;
  deleteImage(id: string): Promise<void>;
  getGalleryImages(galleryId: string): Promise<ImageMetadata[]>;
  /** Purges every stored object belonging to a gallery (DB rows are handled separately via cascade delete). */
  deleteGalleryObjects(galleryId: string): Promise<void>;

  /** Step 1 of the direct-upload flow: authorize + get a presigned PUT URL. */
  createUploadTarget(input: CreateUploadTargetInput): Promise<UploadTarget>;
  /** Step 2: the browser has already PUT the bytes — persist the metadata row. */
  confirmUpload(input: ConfirmUploadInput): Promise<ImageMetadata>;
  /** Best-effort cleanup of an object that was uploaded but never confirmed. */
  deleteStorageObject(storageKey: string): Promise<void>;

  /** Short-lived URL suitable for inline `<img src>` viewing (redirect target). */
  getViewUrl(id: string): Promise<string | null>;
  /** Short-lived URL that forces a download with the original filename. */
  getDownloadUrl(id: string): Promise<DownloadTarget | null>;
  /** Streamed read for building archives without buffering the whole file. */
  getObjectStream(id: string): Promise<ImageObjectStream | null>;
}
