import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireGalleryOwner } from "@/lib/authorize";
import { imageStorage } from "@/lib/storage/r2-image-storage";
import { confirmUploadSchema } from "@/lib/validations";
import { MAX_GALLERY_SIZE, MAX_IMAGES_PER_GALLERY, RATE_LIMITS } from "@/lib/constants";
import { rateLimit, rateLimitResponseInit } from "@/lib/rate-limit";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const [limit, windowMs] = RATE_LIMITS.uploadConfirm;
  const limitResult = rateLimit(`upload-confirm:${session.user.id}`, limit, windowMs);
  if (!limitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please slow down and try again shortly." },
      rateLimitResponseInit(limitResult)
    );
  }

  const { id } = await ctx.params;

  const gallery = await requireGalleryOwner(id, session.user.id);
  if (!gallery) {
    return NextResponse.json(
      { success: false, error: "You don't have permission to perform this action." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = confirmUploadSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const { files } = parsed.data;

  // A storage key can only ever be confirmed into the gallery it was
  // presigned for — this stops a client from attaching an object it
  // didn't request an upload URL for to one of its galleries.
  const galleryPrefix = `galleries/${id}/`;
  const invalidKey = files.find((f) => !f.storageKey.startsWith(galleryPrefix));
  if (invalidKey) {
    return NextResponse.json(
      { success: false, error: "One or more uploads do not belong to this gallery." },
      { status: 400 }
    );
  }

  // Re-check limits at confirm time too — state may have changed since
  // presign (e.g. a concurrent upload from another tab).
  const [existingCount, existingSizeAgg, maxSortOrder] = await Promise.all([
    db.image.count({ where: { galleryId: id } }),
    db.image.aggregate({ where: { galleryId: id }, _sum: { fileSize: true } }),
    db.image.aggregate({ where: { galleryId: id }, _max: { sortOrder: true } }),
  ]);

  if (existingCount + files.length > MAX_IMAGES_PER_GALLERY) {
    return NextResponse.json(
      { success: false, error: `You can upload a maximum of ${MAX_IMAGES_PER_GALLERY} images.` },
      { status: 400 }
    );
  }

  const requestedSize = files.reduce((sum, f) => sum + f.fileSize, 0);
  if ((existingSizeAgg._sum.fileSize ?? 0) + requestedSize > MAX_GALLERY_SIZE) {
    return NextResponse.json(
      { success: false, error: "The total gallery size cannot exceed 100 MB." },
      { status: 400 }
    );
  }

  let nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
  const created = [];
  const failed: string[] = [];

  for (const file of files) {
    try {
      const image = await imageStorage.confirmUpload({
        galleryId: id,
        storageKey: file.storageKey,
        originalName: file.originalName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        width: file.width ?? null,
        height: file.height ?? null,
        sortOrder: nextSortOrder++,
      });
      created.push(image);
    } catch (err) {
      console.error(`Failed to confirm upload for ${file.storageKey}:`, err);
      failed.push(file.originalName);
      // The bytes already landed in R2 but we couldn't record the metadata —
      // clean up rather than leave an unreferenced object behind.
      await imageStorage.deleteStorageObject(file.storageKey);
    }
  }

  if (created.length === 0) {
    return NextResponse.json(
      { success: false, error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: created,
      ...(failed.length > 0 ? { partialFailures: failed } : {}),
    },
    { status: 201 }
  );
}
