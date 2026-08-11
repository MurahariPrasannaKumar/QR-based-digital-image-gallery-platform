"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Download, Link2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function QrCodeDisplay({
  galleryId,
  gallerySlug,
  galleryName,
  galleryUrl,
  qrDataUrl,
}: {
  galleryId: string;
  gallerySlug: string;
  galleryName: string;
  galleryUrl: string;
  qrDataUrl: string;
}) {
  async function handleCopyLink() {
    await navigator.clipboard.writeText(galleryUrl);
    toast.success("Link copied!");
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <Card className="p-6">
        <CardContent className="p-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`QR code linking to the ${galleryName} gallery`}
            width={256}
            height={256}
            className="h-64 w-64"
          />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold">{galleryName}</h2>
        <p className="text-sm text-muted-foreground">Scan to view gallery</p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button render={<a href={`/api/galleries/${galleryId}/qr?format=png`} download />}>
          <Download className="h-4 w-4" />
          Download PNG
        </Button>
        <Button
          variant="outline"
          render={<a href={`/api/galleries/${galleryId}/qr?format=svg`} download />}
        >
          <Download className="h-4 w-4" />
          Download SVG
        </Button>
        <Button variant="outline" onClick={handleCopyLink}>
          <Link2 className="h-4 w-4" />
          Copy Gallery Link
        </Button>
        <Button variant="outline" render={<Link href={`/g/${gallerySlug}`} target="_blank" />}>
          <Eye className="h-4 w-4" />
          View Gallery
        </Button>
      </div>
    </div>
  );
}
