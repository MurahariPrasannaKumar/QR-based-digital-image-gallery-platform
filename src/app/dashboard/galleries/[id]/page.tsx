import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { getOwnedGallery } from "@/lib/galleries";
import { imageStorage } from "@/lib/storage/r2-image-storage";
import { GalleryHeader } from "@/components/gallery/gallery-header";
import { GallerySettingsForm } from "@/components/gallery/gallery-settings-form";
import { ManageImageGrid } from "@/components/gallery/manage-image-grid";
import { AddImagesForm } from "@/components/gallery/add-images-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const gallery = await getOwnedGallery(id, user.id);
  return { title: gallery?.name ?? "Gallery" };
}

export default async function ManageGalleryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const gallery = await getOwnedGallery(id, user.id);
  if (!gallery) notFound();

  const images = await imageStorage.getGalleryImages(id);
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
    <div className="space-y-8">
      <GalleryHeader gallery={gallery} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <AddImagesForm galleryId={gallery.id} />
          <ManageImageGrid galleryId={gallery.id} images={imageDtos} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gallery Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <GallerySettingsForm gallery={gallery} />
        </CardContent>
      </Card>
    </div>
  );
}
