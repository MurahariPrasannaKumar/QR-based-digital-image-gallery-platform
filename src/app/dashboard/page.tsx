import Link from "next/link";
import type { Metadata } from "next";
import { ImagePlus } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getDashboardStats, listGalleriesForUser } from "@/lib/galleries";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { GalleryCard } from "@/components/gallery/gallery-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, galleries] = await Promise.all([
    getDashboardStats(user.id),
    listGalleriesForUser(user.id),
  ]);
  const recent = galleries.slice(0, 4);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}.
        </p>
      </div>

      <StatsCards galleryCount={stats.galleryCount} imageCount={stats.imageCount} />

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recent Galleries</h2>
          {galleries.length > 0 && (
            <Button variant="ghost" size="sm" render={<Link href="/dashboard/galleries" />}>
              View all
            </Button>
          )}
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon={ImagePlus}
            title="No galleries yet"
            description="Create your first gallery to start uploading and sharing photos."
            action={
              <Button render={<Link href="/dashboard/galleries/new" />}>Create Gallery</Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recent.map((gallery) => (
              <GalleryCard key={gallery.id} gallery={gallery} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
