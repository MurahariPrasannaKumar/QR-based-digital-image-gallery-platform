import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GalleryNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <ImageOff className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold">Gallery not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This gallery may have been deleted or the link may be incorrect.
      </p>
      <Button className="mt-6" render={<Link href="/" />}>
        Go Home
      </Button>
    </div>
  );
}
