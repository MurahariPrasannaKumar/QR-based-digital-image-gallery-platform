import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/session";
import { listGalleriesForUser } from "@/lib/galleries";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Galleries" };

export default async function GalleriesPage() {
  const user = await requireUser();
  const galleries = await listGalleriesForUser(user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Galleries</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage all of your photo galleries.
          </p>
        </div>
        <Button render={<Link href="/dashboard/galleries/new" />}>
          <Plus className="h-4 w-4" />
          New Gallery
        </Button>
      </div>

      <GalleryGrid galleries={galleries} />
    </div>
  );
}
