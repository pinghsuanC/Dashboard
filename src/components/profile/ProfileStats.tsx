import { FileStack, Folder } from "lucide-react";

import { TypeIcon } from "@/components/shared/TypeIcon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SidebarItemType } from "@/lib/db/items";

interface ProfileStatsProps {
  items: number;
  collections: number;
  /** Every system type, including those with no items, so zeros show. */
  types: SidebarItemType[];
}

export const ProfileStats = ({ items, collections, types }: ProfileStatsProps) => {
  const totals = [
    { label: "Items", value: items, icon: FileStack },
    { label: "Collections", value: collections, icon: Folder },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid grid-cols-2 gap-4">
          {totals.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-lg">
                <Icon className="size-5" />
              </div>
              <div>
                <p className="font-heading text-2xl font-semibold tabular-nums">{value}</p>
                <p className="text-muted-foreground text-xs">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {types.map((type) => (
            <li
              key={type.id}
              className="bg-muted/40 flex items-center justify-between gap-3 rounded-lg px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm">
                <TypeIcon type={type} className="size-4" />
                {type.label}
              </span>
              <span className="text-muted-foreground text-sm tabular-nums">{type.itemCount}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
