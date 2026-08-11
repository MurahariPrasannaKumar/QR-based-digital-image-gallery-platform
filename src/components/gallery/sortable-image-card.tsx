"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/image-utils";
import type { ImageDto } from "@/types/image";

export function SortableImageCard({
  image,
  onDelete,
}: {
  image: ImageDto;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-muted",
        isDragging && "z-10 opacity-70 shadow-lg"
      )}
    >
      <div className="aspect-square w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/images/${image.id}`}
          alt={image.originalName}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${image.originalName}`}
        className="absolute left-1.5 top-1.5 flex h-7 w-7 cursor-grab items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow-sm transition-opacity active:cursor-grabbing group-hover:opacity-100 focus-visible:opacity-100"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Button
        type="button"
        variant="destructive"
        size="icon-sm"
        onClick={() => onDelete(image.id)}
        aria-label={`Delete ${image.originalName}`}
        className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <div className="truncate bg-background/90 px-2 py-1 text-[11px] text-muted-foreground">
        {formatBytes(image.fileSize)}
      </div>
    </div>
  );
}
