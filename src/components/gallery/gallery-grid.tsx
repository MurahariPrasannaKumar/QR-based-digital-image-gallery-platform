"use client";

import { useMemo, useState } from "react";
import { Search, ImagePlus } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GalleryCard } from "@/components/gallery/gallery-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { GallerySummary } from "@/types/gallery";

export function GalleryGrid({ galleries }: { galleries: GallerySummary[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return galleries;
    return galleries.filter((g) => g.name.toLowerCase().includes(q));
  }, [galleries, query]);

  if (galleries.length === 0) {
    return (
      <EmptyState
        icon={ImagePlus}
        title="No galleries yet"
        description="Create your first gallery to start uploading and sharing photos."
        action={
          <Button render={<Link href="/dashboard/galleries/new" />}>Create Gallery</Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search galleries..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          aria-label="Search galleries"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No galleries match &quot;{query}&quot;.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((gallery) => (
            <GalleryCard key={gallery.id} gallery={gallery} />
          ))}
        </div>
      )}
    </div>
  );
}
