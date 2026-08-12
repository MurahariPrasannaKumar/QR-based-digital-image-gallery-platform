import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { requireGalleryOwner } from "@/lib/authorize";
import { imageStorage } from "@/lib/storage/supabase-image-storage";
import { presignUploadSchema } from "@/lib/validations";
import { MAX_GALLERY_SIZE, MAX_IMAGES_PER_GALLERY, RATE_LIMITS } from "@/lib/constants";
import { rateLimit, rateLimitResponseInit } from "@/lib/rate-limit";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const [limit, windowMs] = RATE_LIMITS.uploadPresign;
  const limitResult = rateLimit(`upload-presign:${user.id}`, limit, windowMs);
  if (!limitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many upload requests. Please slow down and try again shortly." },
      rateLimitResponseInit(limitResult)
    );
  }

  const { id } = await ctx.params;

  // Never trust a gallery id from the client without checking ownership —
  // this is what stops an attacker from requesting upload URLs for
  // someone else's gallery by guessing/enumerating ids.
  const gallery = await requireGalleryOwner(id, user.id);
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

  const parsed = presignUploadSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const { files } = parsed.data;

  const [existingCount, existingSizeAgg] = await Promise.all([
    db.image.count({ where: { galleryId: id } }),
    db.image.aggregate({ where: { galleryId: id }, _sum: { fileSize: true } }),
  ]);

  if (existingCount + files.length > MAX_IMAGES_PER_GALLERY) {
    return NextResponse.json(
      { success: false, error: `You can upload a maximum of ${MAX_IMAGES_PER_GALLERY} images.` },
      { status: 400 }
    );
  }

  const requestedSize = files.reduce((sum, f) => sum + f.fileSize, 0);
  const totalSize = (existingSizeAgg._sum.fileSize ?? 0) + requestedSize;
  if (totalSize > MAX_GALLERY_SIZE) {
    return NextResponse.json(
      { success: false, error: "The total gallery size cannot exceed 100 MB." },
      { status: 400 }
    );
  }

  const targets = await Promise.all(
    files.map((file) =>
      imageStorage.createUploadTarget({
        galleryId: id,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
      })
    )
  );

  return NextResponse.json({
    success: true,
    data: targets.map((target, i) => ({
      storageKey: target.storageKey,
      uploadUrl: target.uploadUrl,
      originalName: files[i].originalName,
      mimeType: files[i].mimeType,
      fileSize: files[i].fileSize,
    })),
  });
}
