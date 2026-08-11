import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireGalleryOwner } from "@/lib/authorize";
import { generateQrPngBuffer, generateQrSvgString, getGalleryUrl } from "@/lib/qr";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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

  const format = req.nextUrl.searchParams.get("format") === "svg" ? "svg" : "png";
  const url = getGalleryUrl(gallery.slug);
  const filenameBase = gallery.slug;

  if (format === "svg") {
    const svg = await generateQrSvgString(url);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="${filenameBase}-qr.svg"`,
      },
    });
  }

  const png = await generateQrPngBuffer(url);
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filenameBase}-qr.png"`,
    },
  });
}
