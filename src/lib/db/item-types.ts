import { itemTypeHref } from "@/lib/constants/routes";
import { prisma } from "@/lib/prisma";

/** A built-in item type as every screen shows it. The same for every user. */
export interface ItemTypeDefinition {
  id: string;
  /** Slug: "snippet", "file", ... */
  name: string;
  label: string;
  icon: string | null;
  color: string;
  /** `/items/snippets`: routes are plural, the stored type `name` is not. */
  route: string;
}

/**
 * The built-in types, in display order. Read through the user session
 * (`getUserSession()`), not directly. Custom (Pro) types are not listed yet.
 */
export const getSystemItemTypeDefinitions = async (): Promise<ItemTypeDefinition[]> => {
  const types = await prisma.itemType.findMany({
    // userId: null too: a user-owned row flagged isSystem must not show up
    // for every user.
    where: { isSystem: true, userId: null },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
    select: { id: true, name: true, label: true, icon: true, color: true },
  });

  return types.map((type) => ({ ...type, route: itemTypeHref(type.name) }));
};
