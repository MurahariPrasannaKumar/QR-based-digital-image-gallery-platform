"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, QrCode, Link2, Trash2, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { GallerySummary } from "@/types/gallery";

export function GalleryHeader({ gallery }: { gallery: GallerySummary }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleCopyLink() {
    const url = `${window.location.origin}/g/${gallery.slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  }

  async function handleDelete() {
    const res = await fetch(`/api/galleries/${gallery.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      toast.error(json?.error ?? "Failed to delete gallery.");
      return;
    }
    toast.success("Gallery deleted.");
    router.push("/dashboard/galleries");
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{gallery.name}</h1>
            <Badge variant="secondary" className="gap-1">
              {gallery.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {gallery.isPublic ? "Public" : "Protected"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {gallery.imageCount} {gallery.imageCount === 1 ? "image" : "images"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href={`/g/${gallery.slug}`} target="_blank" />}>
            <Eye className="h-4 w-4" />
            View Gallery
          </Button>
          <Button
            variant="outline"
            render={<Link href={`/dashboard/galleries/${gallery.id}/qr`} />}
          >
            <QrCode className="h-4 w-4" />
            Generate QR
          </Button>
          <Button variant="outline" onClick={handleCopyLink}>
            <Link2 className="h-4 w-4" />
            Copy Link
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Gallery?"
        destructive
        confirmLabel="Delete Gallery"
        description={
          <>
            This will permanently delete <strong>{gallery.name}</strong>, all image metadata, and
            all stored image data. This action cannot be undone.
          </>
        }
        onConfirm={handleDelete}
      />
    </>
  );
}
