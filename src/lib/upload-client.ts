import { getImageDimensions } from "@/lib/image-utils";

export interface UploadResult {
  success: boolean;
  error?: string;
}

interface PresignTarget {
  storageKey: string;
  uploadUrl: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
}

function putFileToR2(
  url: string,
  file: File,
  onLoaded: (loadedBytes: number) => void
): Promise<{ success: boolean }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onLoaded(event.loaded);
    };

    xhr.onload = () => resolve({ success: xhr.status >= 200 && xhr.status < 300 });
    xhr.onerror = () => resolve({ success: false });

    xhr.send(file);
  });
}

/**
 * Uploads files directly to R2 using presigned URLs — bytes never pass
 * through the Next.js server. Flow: presign -> PUT to R2 -> confirm.
 */
export async function uploadImagesToGallery(
  galleryId: string,
  files: File[],
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  if (files.length === 0) return { success: true };

  const dimensions = await Promise.all(files.map(getImageDimensions));

  const presignRes = await fetch(`/api/galleries/${galleryId}/images/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: files.map((file) => ({
        originalName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      })),
    }),
  });
  const presignJson = await presignRes.json();
  if (!presignRes.ok || !presignJson.success) {
    return { success: false, error: presignJson.error ?? "Upload failed. Please try again." };
  }
  const targets: PresignTarget[] = presignJson.data;

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const loadedPerFile = new Array(files.length).fill(0);
  const reportProgress = () => {
    if (!onProgress || totalBytes === 0) return;
    const loaded = loadedPerFile.reduce((sum, n) => sum + n, 0);
    onProgress(Math.round((loaded / totalBytes) * 100));
  };

  const putResults = await Promise.all(
    files.map((file, i) =>
      putFileToR2(targets[i].uploadUrl, file, (loaded) => {
        loadedPerFile[i] = loaded;
        reportProgress();
      })
    )
  );

  const succeeded = putResults
    .map((result, i) => (result.success ? i : -1))
    .filter((i) => i !== -1);

  if (succeeded.length === 0) {
    return { success: false, error: "Upload failed. Please try again." };
  }

  const confirmRes = await fetch(`/api/galleries/${galleryId}/images/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      files: succeeded.map((i) => ({
        storageKey: targets[i].storageKey,
        originalName: targets[i].originalName,
        mimeType: targets[i].mimeType,
        fileSize: targets[i].fileSize,
        width: dimensions[i].width || null,
        height: dimensions[i].height || null,
      })),
    }),
  });
  const confirmJson = await confirmRes.json();
  if (!confirmRes.ok || !confirmJson.success) {
    return { success: false, error: confirmJson.error ?? "Upload failed. Please try again." };
  }

  if (succeeded.length < files.length) {
    const failedCount = files.length - succeeded.length;
    return {
      success: false,
      error: `${failedCount} image${failedCount === 1 ? "" : "s"} failed to upload. The rest were saved.`,
    };
  }

  return { success: true };
}
