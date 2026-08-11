import { Images, LayoutGrid } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatsCards({
  galleryCount,
  imageCount,
}: {
  galleryCount: number;
  imageCount: number;
}) {
  const stats = [
    { label: "Total Galleries", value: galleryCount, icon: LayoutGrid },
    { label: "Total Images", value: imageCount, icon: Images },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">{stat.value}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <stat.icon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
