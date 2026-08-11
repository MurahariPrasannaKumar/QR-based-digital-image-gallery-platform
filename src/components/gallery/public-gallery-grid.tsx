"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { Lightbox } from "@/components/image-viewer/lightbox";
import { EmptyState } from "@/components/shared/empty-state";
import type { ImageDto } from "@/types/image";

export function PublicGalleryGrid({ images }: { images: ImageDto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <EmptyState
        icon={ImageOff}
        title="No images yet"
        description="This gallery doesn't contain any images."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="aspect-square overflow-hidden rounded-lg bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Open ${image.originalName}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/images/${image.id}`}
              alt={image.originalName}
              className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <Lightbox images={images} startIndex={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </>
  );
}
