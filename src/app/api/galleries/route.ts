import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { generateUniqueSlug } from "@/lib/slug";
import { createGallerySchema } from "@/lib/validations";
import { listGalleriesForUser } from "@/lib/galleries";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const galleries = await listGalleriesForUser(session.user.id);
  return NextResponse.json({ success: true, data: galleries });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = createGallerySchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const { name, description, isPublic, password } = parsed.data;
  const slug = await generateUniqueSlug(name);
  const passwordHash = !isPublic && password ? await bcrypt.hash(password, 12) : null;

  const gallery = await db.gallery.create({
    data: {
      userId: session.user.id,
      name,
      description: description || null,
      slug,
      isPublic,
      passwordHash,
    },
    select: { id: true, slug: true },
  });

  return NextResponse.json({ success: true, data: gallery }, { status: 201 });
}
