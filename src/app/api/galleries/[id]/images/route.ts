import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireGalleryOwner } from "@/lib/authorize";
import { imageStorage } from "@/lib/storage/postgres-image-storage";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_GALLERY_SIZE,
  MAX_IMAGES_PER_GALLERY,
  MAX_IMAGE_SIZE,
} from "@/lib/constants";
import { validateImageFile } from "@/lib/validations";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const gallery = await requireGalleryOwner(id, session.user.id);
  if (!gallery) {
    return NextResponse.json(
      { success: false, error: "You don't have permission to perform this action." },
      { status: 403 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid upload data." }, { status: 400 });
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ success: false, error: "No images were provided." }, { status: 400 });
  }

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

  let totalSize = existingSizeAgg._sum.fileSize ?? 0;
  const widths = formData.getAll("widths").map((v) => Number(v));
  const heights = formData.getAll("heights").map((v) => Number(v));

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      return NextResponse.json(
        { success: false, error: "Only JPG, JPEG and PNG files are supported." },
        { status: 400 }
      );
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { success: false, error: `"${file.name}" is larger than 5 MB.` },
        { status: 400 }
      );
    }
    totalSize += file.size;
  }

  if (totalSize > MAX_GALLERY_SIZE) {
    return NextResponse.json(
      { success: false, error: "The total gallery size cannot exceed 100 MB." },
      { status: 400 }
    );
  }

  let nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;
  const created = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const validationError = validateImageFile(file);
    if (validationError) {
      return NextResponse.json({ success: false, error: validationError }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const image = await imageStorage.saveImage({
      galleryId: id,
      originalName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      data: buffer,
      width: Number.isFinite(widths[i]) ? widths[i] : null,
      height: Number.isFinite(heights[i]) ? heights[i] : null,
      sortOrder: nextSortOrder++,
    });
    created.push(image);
  }

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
