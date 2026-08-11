import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getPublicGalleryBySlug } from "@/lib/public-gallery";
import { hasGalleryAccess } from "@/lib/gallery-access";
import { imageStorage } from "@/lib/storage/r2-image-storage";
import { PasswordGate } from "@/components/gallery/password-gate";
import { PublicGalleryGrid } from "@/components/gallery/public-gallery-grid";
import { ShareButton } from "@/components/shared/share-button";
import { DownloadAllButton } from "@/components/gallery/download-all-button";
import { Logo } from "@/components/shared/logo";
import { getGalleryUrl } from "@/lib/qr";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const gallery = await getPublicGalleryBySlug(slug);
  if (!gallery) return { title: "Gallery not found" };

  return {
    title: gallery.name,
    description: "View and download photos from this gallery.",
  };
}

export default async function PublicGalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gallery = await getPublicGalleryBySlug(slug);
  if (!gallery) notFound();

  const unlocked = gallery.isPublic || (await hasGalleryAccess(gallery.id));
  if (!unlocked) {
    return <PasswordGate slug={gallery.slug} />;
  }

  const images = await imageStorage.getGalleryImages(gallery.id);
  const imageDtos = images.map((img) => ({
    id: img.id,
    originalName: img.originalName,
    mimeType: img.mimeType,
    fileSize: img.fileSize,
    width: img.width,
    height: img.height,
    sortOrder: img.sortOrder,
    createdAt: img.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <Logo />
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{gallery.name}</h1>
              <p className="text-sm text-muted-foreground">
                {gallery.imageCount} {gallery.imageCount === 1 ? "photo" : "photos"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ShareButton title={gallery.name} url={getGalleryUrl(gallery.slug)} />
              <DownloadAllButton slug={gallery.slug} imageCount={gallery.imageCount} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <PublicGalleryGrid images={imageDtos} />
      </main>
    </div>
  );
}
