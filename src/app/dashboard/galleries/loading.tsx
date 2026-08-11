import { Skeleton } from "@/components/ui/skeleton";
import { GalleryGridSkeleton } from "@/components/dashboard/gallery-grid-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <GalleryGridSkeleton />
    </div>
  );
}
