import crypto from "crypto";
import type { Readable } from "stream";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db } from "@/lib/db";
import { getSupabaseStorageClient, getSupabaseBucketName } from "@/lib/storage/supabase-client";
import type {
  ImageStorage,
  ImageMetadata,
  ImageWithData,
  SaveImageInput,
  CreateUploadTargetInput,
  UploadTarget,
  ConfirmUploadInput,
  DownloadTarget,
  ImageObjectStream,
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

// Presigned PUT: generous window since large files on slow connections take time.
const UPLOAD_URL_TTL_SECONDS = 10 * 60;
// Presigned GET for inline viewing — long enough that a page full of <img> tags
// doesn't need to be re-signed on every render, short enough to not be a
// permanent public link.
const VIEW_URL_TTL_SECONDS = 60 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 5 * 60;

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
};

/**
 * Storage keys are always derived from server-validated data (gallery id +
 * a random id + an extension picked from a fixed MIME map) — never from a
 * client-supplied filename. This rules out path traversal and extension
 * spoofing by construction.
 */
function buildStorageKey(galleryId: string, mimeType: string): string {
  const ext = MIME_TO_EXTENSION[mimeType] ?? "bin";
  return `galleries/${galleryId}/${crypto.randomUUID()}.${ext}`;
}

/** Strips characters that would let a filename break out of the header value. */
function sanitizeFilenameForHeader(name: string): string {
  return name.replace(/[\r\n"]/g, "").slice(0, 255) || "download";
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

type MetadataRow = {
  id: string;
  galleryId: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  sortOrder: number;
  createdAt: Date;
};

function toMetadata(row: MetadataRow): ImageMetadata {
  return {
    id: row.id,
    galleryId: row.galleryId,
    originalName: row.originalName,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    width: row.width,
    height: row.height,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  };
}

class SupabaseImageStorage implements ImageStorage {
  async saveImage(input: SaveImageInput): Promise<ImageMetadata> {
    const storageKey = buildStorageKey(input.galleryId, input.mimeType);
    const client = getSupabaseStorageClient();

    await client.send(
      new PutObjectCommand({
        Bucket: getSupabaseBucketName(),
        Key: storageKey,
        Body: input.data,
        ContentType: input.mimeType,
      })
    );

    const image = await db.image.create({
      data: {
        galleryId: input.galleryId,
        originalName: input.originalName,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        storageKey,
        width: input.width ?? null,
        height: input.height ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
      select: METADATA_SELECT,
    });

    return toMetadata(image);
  }

  async getImage(id: string): Promise<ImageWithData | null> {
    const row = await db.image.findUnique({
      where: { id },
      select: { ...METADATA_SELECT, storageKey: true },
    });
    if (!row?.storageKey) return null;

    const client = getSupabaseStorageClient();
    const res = await client.send(
      new GetObjectCommand({ Bucket: getSupabaseBucketName(), Key: row.storageKey })
    );
    const data = await streamToBuffer(res.Body as Readable);

    return { ...toMetadata(row), data };
  }

  async deleteImage(id: string): Promise<void> {
    const row = await db.image.findUnique({ where: { id }, select: { storageKey: true } });
    if (row?.storageKey) {
      await this.deleteStorageObject(row.storageKey);
    }
    await db.image.delete({ where: { id } });
  }

  async getGalleryImages(galleryId: string): Promise<ImageMetadata[]> {
    const rows = await db.image.findMany({
      where: { galleryId },
      select: METADATA_SELECT,
      orderBy: { sortOrder: "asc" },
    });
    return rows.map(toMetadata);
  }

  async deleteGalleryObjects(galleryId: string): Promise<void> {
    const rows = await db.image.findMany({ where: { galleryId }, select: { storageKey: true } });
    // Best-effort, in parallel — a handful of failures here just leave a
    // few orphaned objects behind rather than blocking gallery deletion.
    await Promise.all(rows.map((row) => this.deleteStorageObject(row.storageKey)));
  }

  async createUploadTarget(input: CreateUploadTargetInput): Promise<UploadTarget> {
    const storageKey = buildStorageKey(input.galleryId, input.mimeType);
    const client = getSupabaseStorageClient();

    const command = new PutObjectCommand({
      Bucket: getSupabaseBucketName(),
      Key: storageKey,
      ContentType: input.mimeType,
      ContentLength: input.fileSize,
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    });

    return { storageKey, uploadUrl, expiresInSeconds: UPLOAD_URL_TTL_SECONDS };
  }

  async confirmUpload(input: ConfirmUploadInput): Promise<ImageMetadata> {
    const image = await db.image.create({
      data: {
        galleryId: input.galleryId,
        originalName: input.originalName,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        storageKey: input.storageKey,
        width: input.width ?? null,
        height: input.height ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
      select: METADATA_SELECT,
    });

    return toMetadata(image);
  }

  async deleteStorageObject(storageKey: string): Promise<void> {
    try {
      const client = getSupabaseStorageClient();
      await client.send(new DeleteObjectCommand({ Bucket: getSupabaseBucketName(), Key: storageKey }));
    } catch (err) {
      // Best-effort — a failed cleanup leaves an orphaned object, not a
      // correctness problem, so we log rather than throw.
      console.error(`Failed to delete Supabase Storage object "${storageKey}":`, err);
    }
  }

  async getViewUrl(id: string): Promise<string | null> {
    const row = await db.image.findUnique({
      where: { id },
      select: { storageKey: true, gallery: { select: { isPublic: true } } },
    });
    if (!row?.storageKey) return null;

    // The public-URL fast path is only safe for images in a public gallery.
    // Supabase Storage buckets are either fully public or fully private —
    // there are no per-object ACLs — so if SUPABASE_PUBLIC_URL is
    // configured, the whole bucket is reachable at that domain. Handing out
    // a durable, unsigned link for a private/password-protected gallery's
    // image would defeat its access control entirely. Private images always
    // get a short-lived signed URL instead, regardless of this setting.
    const publicBase = process.env.SUPABASE_PUBLIC_URL;
    if (publicBase && row.gallery.isPublic) {
      return `${publicBase.replace(/\/$/, "")}/${row.storageKey}`;
    }

    const client = getSupabaseStorageClient();
    const command = new GetObjectCommand({ Bucket: getSupabaseBucketName(), Key: row.storageKey });
    return getSignedUrl(client, command, { expiresIn: VIEW_URL_TTL_SECONDS });
  }

  async getDownloadUrl(id: string): Promise<DownloadTarget | null> {
    const row = await db.image.findUnique({
      where: { id },
      select: { storageKey: true, originalName: true, mimeType: true },
    });
    if (!row?.storageKey) return null;

    const client = getSupabaseStorageClient();
    const filename = sanitizeFilenameForHeader(row.originalName);
    const command = new GetObjectCommand({
      Bucket: getSupabaseBucketName(),
      Key: row.storageKey,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
      ResponseContentType: row.mimeType,
    });

    const url = await getSignedUrl(client, command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
    return { url, originalName: row.originalName };
  }

  async getObjectStream(id: string): Promise<ImageObjectStream | null> {
    const row = await db.image.findUnique({
      where: { id },
      select: { storageKey: true, mimeType: true, fileSize: true, originalName: true },
    });
    if (!row?.storageKey) return null;

    const client = getSupabaseStorageClient();
    const res = await client.send(
      new GetObjectCommand({ Bucket: getSupabaseBucketName(), Key: row.storageKey })
    );

    return {
      stream: res.Body as Readable,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      originalName: row.originalName,
    };
  }
}

export const imageStorage: ImageStorage = new SupabaseImageStorage();
