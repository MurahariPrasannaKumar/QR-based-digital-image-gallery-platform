import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getOwnedGallery } from "@/lib/galleries";
import { generateQrPngDataUrl, getGalleryUrl } from "@/lib/qr";
import { QrCodeDisplay } from "@/components/qr/qr-code-display";

export const metadata: Metadata = { title: "Gallery QR Code" };

export default async function GalleryQrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const gallery = await getOwnedGallery(id, user.id);
  if (!gallery) notFound();

  const url = getGalleryUrl(gallery.slug);
  const qrDataUrl = await generateQrPngDataUrl(url);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Your Gallery QR</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Print it, share it, or drop it into any document.
        </p>
      </div>
      <QrCodeDisplay
        galleryId={gallery.id}
        gallerySlug={gallery.slug}
        galleryName={gallery.name}
        galleryUrl={url}
        qrDataUrl={qrDataUrl}
      />
    </div>
  );
}
