"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateImageFile } from "@/lib/validations";
import {
  MAX_GALLERY_SIZE,
  MAX_IMAGES_PER_GALLERY,
  ALLOWED_IMAGE_EXTENSIONS,
} from "@/lib/constants";
import { formatBytes } from "@/lib/image-utils";
import { ImagePreviewGrid } from "@/components/upload/image-preview-grid";

export function ImageUploader({
  files,
  onFilesChange,
  disabled,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      setError(null);
      const incomingArray = Array.from(incoming);
      const next: File[] = [...files];

      for (const file of incomingArray) {
        const validationError = validateImageFile(file);
        if (validationError) {
          setError(validationError);
          continue;
        }
        if (next.length >= MAX_IMAGES_PER_GALLERY) {
          setError(`You can upload a maximum of ${MAX_IMAGES_PER_GALLERY} images.`);
          break;
        }
        const totalSize = next.reduce((sum, f) => sum + f.size, 0) + file.size;
        if (totalSize > MAX_GALLERY_SIZE) {
          setError("The total gallery size cannot exceed 100 MB.");
          break;
        }
        next.push(file);
      }

      onFilesChange(next);
    },
    [files, onFilesChange]
  );

  function handleRemove(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (disabled) return;
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        aria-label="Upload images"
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_IMAGE_EXTENSIONS.join(",")}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <UploadCloud className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">
          Drag &amp; drop images here, or{" "}
          <span className="text-primary underline underline-offset-2">browse files</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPG, JPEG, PNG — up to 5 MB each, {MAX_IMAGES_PER_GALLERY} images max
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {files.length} / {MAX_IMAGES_PER_GALLERY} images · {formatBytes(totalSize)} total
        </p>
      )}

      <ImagePreviewGrid
        files={files}
        onRemove={handleRemove}
        onClearAll={() => onFilesChange([])}
        disabled={disabled}
      />
    </div>
  );
}
