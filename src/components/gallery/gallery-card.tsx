"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon, MoreVertical, Eye, QrCode, Pencil, Trash2, Lock, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { GallerySummary } from "@/types/gallery";

export function GalleryCard({ gallery }: { gallery: GallerySummary }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDelete() {
    const res = await fetch(`/api/galleries/${gallery.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      toast.error(json?.error ?? "Failed to delete gallery.");
      return;
    }
    toast.success("Gallery deleted.");
    router.refresh();
  }

  return (
    <>
      <Card className="group overflow-hidden py-0 gap-0">
        <Link
          href={`/dashboard/galleries/${gallery.id}`}
          className="relative block aspect-4/3 w-full overflow-hidden bg-muted"
        >
          {gallery.coverImageId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/images/${gallery.coverImageId}`}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}
          <Badge
            variant="secondary"
            className="absolute left-2 top-2 gap-1 bg-background/90 backdrop-blur-sm"
          >
            {gallery.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {gallery.isPublic ? "Public" : "Protected"}
          </Badge>
        </Link>

        <div className="flex items-start justify-between gap-2 p-4">
          <div className="min-w-0">
            <Link
              href={`/dashboard/galleries/${gallery.id}`}
              className="block truncate font-medium hover:underline"
            >
              {gallery.name}
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              {gallery.imageCount} {gallery.imageCount === 1 ? "image" : "images"} ·{" "}
              {new Date(gallery.createdAt).toLocaleDateString()}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="shrink-0" aria-label="Gallery actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={`/g/${gallery.slug}`} target="_blank" />}>
                <Eye className="h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href={`/dashboard/galleries/${gallery.id}/qr`} />}>
                <QrCode className="h-4 w-4" />
                QR Code
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href={`/dashboard/galleries/${gallery.id}`} />}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

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
