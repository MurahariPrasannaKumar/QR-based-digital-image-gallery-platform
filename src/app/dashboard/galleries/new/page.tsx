import type { Metadata } from "next";
import { GalleryForm } from "@/components/gallery/gallery-form";

export const metadata: Metadata = { title: "Create New Gallery" };

export default function NewGalleryPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create New Gallery</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Give your gallery a name, choose who can view it, and upload your photos.
        </p>
      </div>
      <GalleryForm />
    </div>
  );
}
