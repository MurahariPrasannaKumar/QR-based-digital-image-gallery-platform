import { Skeleton } from "@/components/ui/skeleton";
import { GalleryGridSkeleton } from "@/components/dashboard/gallery-grid-skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <GalleryGridSkeleton count={4} />
    </div>
  );
}
