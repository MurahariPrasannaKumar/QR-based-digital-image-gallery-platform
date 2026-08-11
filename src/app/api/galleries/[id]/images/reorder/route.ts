import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireGalleryOwner } from "@/lib/authorize";
import { reorderImagesSchema } from "@/lib/validations";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = reorderImagesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid input." }, { status: 400 });
  }

  const existing = await db.image.findMany({
    where: { galleryId: id },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((img) => img.id));
  const providedIds = parsed.data.imageIds;

  if (
    providedIds.length !== existingIds.size ||
    !providedIds.every((imgId) => existingIds.has(imgId))
  ) {
    return NextResponse.json(
      { success: false, error: "Image list does not match this gallery." },
      { status: 400 }
    );
  }

  await db.$transaction(
    providedIds.map((imageId, index) =>
      db.image.update({ where: { id: imageId }, data: { sortOrder: index } })
    )
  );

  return NextResponse.json({ success: true });
}
