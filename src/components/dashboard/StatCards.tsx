import { FileStack, Folder, FolderHeart, Star, type LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { CollectionStats, ItemStats } from "@/lib/session-selectors";

type DashboardStats = ItemStats & CollectionStats;

interface StatCardsProps {
  stats: DashboardStats;
}

/**
 * Keyed off `DashboardStats` so adding a stat is a change in two places that
 * TypeScript keeps honest: the interface and this array.
 */
const STATS: { key: keyof DashboardStats; label: string; icon: LucideIcon }[] = [
  { key: "items", label: "Items", icon: FileStack },
  { key: "collections", label: "Collections", icon: Folder },
  { key: "favoriteItems", label: "Favorite items", icon: Star },
  {
    key: "favoriteCollections",
    label: "Favorite collections",
    icon: FolderHeart,
  },
];

export const StatCards = ({ stats }: StatCardsProps) => {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {STATS.map(({ key, label, icon: Icon }) => (
        <Card key={key}>
          <CardContent className="flex items-center gap-3">
            <div className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-lg">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-2xl font-semibold tabular-nums">
                {stats[key]}
              </p>
              {/* Wraps rather than truncates: "Favorite collections" does not
                  fit one line in a quarter-width card at ~1024px. */}
              <p className="text-muted-foreground text-xs leading-tight">
                {label}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
