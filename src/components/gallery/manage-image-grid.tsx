"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { ImageIcon } from "lucide-react";
import { SortableImageCard } from "@/components/gallery/sortable-image-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { ImageDto } from "@/types/image";

export function ManageImageGrid({
  galleryId,
  images: initialImages,
}: {
  galleryId: string;
  images: ImageDto[];
}) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function persistOrder(ordered: ImageDto[]) {
    const res = await fetch(`/api/galleries/${galleryId}/images/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageIds: ordered.map((img) => img.id) }),
    });
    if (!res.ok) {
      toast.error("Failed to save the new image order.");
      router.refresh();
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setImages((current) => {
      const oldIndex = current.findIndex((img) => img.id === active.id);
      const newIndex = current.findIndex((img) => img.id === over.id);
      const next = arrayMove(current, oldIndex, newIndex);
      void persistOrder(next);
      return next;
    });
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteId) return;
    const res = await fetch(`/api/images/${pendingDeleteId}`, { method: "DELETE" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      toast.error(json?.error ?? "Failed to delete image.");
      return;
    }
    setImages((current) => current.filter((img) => img.id !== pendingDeleteId));
    toast.success("Image deleted.");
    router.refresh();
  }

  if (images.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No images yet"
        description="Add images to this gallery using the uploader above."
      />
    );
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {images.map((image) => (
              <SortableImageCard
                key={image.id}
                image={image}
                onDelete={(id) => setPendingDeleteId(id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <ConfirmDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title="Delete Image?"
        destructive
        confirmLabel="Delete Image"
        description="This will permanently remove this image from the gallery. This action cannot be undone."
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
