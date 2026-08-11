"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { formatBytes } from "@/lib/image-utils";
import { Button } from "@/components/ui/button";

export function ImagePreviewGrid({
  files,
  onRemove,
  onClearAll,
  disabled,
}: {
  files: File[];
  onRemove: (index: number) => void;
  onClearAll: () => void;
  disabled?: boolean;
}) {
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  if (files.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-sm font-medium">
        Selected Images ({files.length})
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${file.size}-${index}`}
            className="group relative overflow-hidden rounded-lg border bg-muted"
          >
            <div className="aspect-square w-full overflow-hidden">
              {previews[index] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previews[index]}
                  alt={file.name}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(index)}
              aria-label={`Remove ${file.name}`}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="truncate bg-background/90 px-2 py-1 text-[11px] text-muted-foreground">
              {formatBytes(file.size)}
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        className="mt-2 text-muted-foreground"
        onClick={onClearAll}
      >
        Clear all
      </Button>
    </div>
  );
}
