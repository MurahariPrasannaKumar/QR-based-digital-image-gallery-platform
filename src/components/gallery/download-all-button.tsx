"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DownloadAllButton({
  slug,
  imageCount,
}: {
  slug: string;
  imageCount: number;
}) {
  const [stage, setStage] = useState<"idle" | "preparing" | "zipping">("idle");

  async function handleDownload() {
    setStage("preparing");
    try {
      setStage("zipping");
      const res = await fetch(`/api/galleries/${slug}/download-all`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        toast.error(json?.error ?? "Failed to prepare download.");
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="?([^"]+)"?/.exec(disposition);
      const filename = match ? decodeURIComponent(match[1]) : "gallery.zip";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to prepare download. Please try again.");
    } finally {
      setStage("idle");
    }
  }

  return (
    <Button variant="outline" onClick={handleDownload} disabled={stage !== "idle" || imageCount === 0}>
      {stage === "idle" && (
        <>
          <Download className="h-4 w-4" />
          Download All {imageCount} {imageCount === 1 ? "Image" : "Images"}
        </>
      )}
      {stage === "preparing" && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparing your download...
        </>
      )}
      {stage === "zipping" && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Creating ZIP file...
        </>
      )}
    </Button>
  );
}
