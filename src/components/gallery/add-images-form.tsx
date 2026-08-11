"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ImageUploader } from "@/components/upload/image-uploader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadImagesToGallery } from "@/lib/upload-client";

export function AddImagesForm({ galleryId }: { galleryId: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  async function handleUpload() {
    if (files.length === 0) return;
    setIsUploading(true);
    setProgress(0);
    try {
      const result = await uploadImagesToGallery(galleryId, files, setProgress);
      if (!result.success) {
        toast.error(result.error ?? "Upload failed. Please try again.");
        return;
      }
      toast.success(`${files.length} image${files.length === 1 ? "" : "s"} added.`);
      setFiles([]);
      router.refresh();
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  }

  return (
    <div className="space-y-4">
      <ImageUploader files={files} onFilesChange={setFiles} disabled={isUploading} />

      {isUploading && progress !== null && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Uploading images... {progress}%</p>
          <Progress value={progress} />
        </div>
      )}

      {files.length > 0 && (
        <Button onClick={handleUpload} disabled={isUploading}>
          {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
          Upload {files.length} {files.length === 1 ? "Image" : "Images"}
        </Button>
      )}
    </div>
  );
}
