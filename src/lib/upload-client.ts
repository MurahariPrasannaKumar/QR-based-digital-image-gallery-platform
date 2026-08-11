import { getImageDimensions } from "@/lib/image-utils";

export interface UploadResult {
  success: boolean;
  error?: string;
}

export async function uploadImagesToGallery(
  galleryId: string,
  files: File[],
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  if (files.length === 0) return { success: true };

  const dimensions = await Promise.all(files.map(getImageDimensions));

  const formData = new FormData();
  files.forEach((file, i) => {
    formData.append("files", file);
    formData.append("widths", String(dimensions[i].width || ""));
    formData.append("heights", String(dimensions[i].height || ""));
  });

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/galleries/${galleryId}/images`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && json.success) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: json.error ?? "Upload failed. Please try again." });
        }
      } catch {
        resolve({ success: false, error: "Upload failed. Please try again." });
      }
    };

    xhr.onerror = () => resolve({ success: false, error: "Upload failed. Please try again." });

    xhr.send(formData);
  });
}
