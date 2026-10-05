"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { signOutAction } from "@/actions/auth";
import { ItemDrawer, type ItemDrawerLoad } from "@/components/items/ItemDrawer";
import { ROUTES } from "@/lib/constants/routes";
import type { ItemSummary } from "@/lib/db/items";
import { fetchItemDetail } from "@/lib/fetch-item-detail";

interface ItemDrawerContextValue {
  /** Opens the drawer on this item at once, then loads its body. */
  openItem: (summary: ItemSummary) => void;
}

const ItemDrawerContext = createContext<ItemDrawerContextValue | null>(null);

interface DrawerState {
  summary: ItemSummary;
  load: ItemDrawerLoad;
  open: boolean;
}

/**
 * Owns the item drawer for every page in the `(app)` layout, since the pages
 * themselves are server components. Cards open it through `useItemDrawer()`.
 */
export const ItemDrawerProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const [state, setState] = useState<DrawerState | null>(null);

  // Navigating closes the drawer. Adjusted during render rather than in an
  // effect, so the new page never paints with the old drawer still open.
  const [shownPathname, setShownPathname] = useState(pathname);
  if (pathname !== shownPathname) {
    setShownPathname(pathname);
    setState((current) => current && { ...current, open: false });
  }

  // Bumped per open, so a slow response for an earlier click is dropped
  // instead of replacing the item the user clicked since.
  const latestRequest = useRef(0);

  const openItem = useCallback(
    (summary: ItemSummary) => {
      const request = ++latestRequest.current;
      setState({ summary, load: { status: "loading" }, open: true });

      void fetchItemDetail(summary.id).then((result) => {
        if (request !== latestRequest.current) return;
        switch (result.status) {
          case "ok":
            setState((current) => current && { ...current, load: result });
            break;
          case "error":
            setState((current) => current && { ...current, load: { status: "error" } });
            break;
          case "signed-out":
            window.location.assign(result.url);
            break;
          case "not-found":
            // Cards only carry ids the server just loaded for this user, so
            // a 404 means a tampered request: end the session. If the action
            // itself can't be reached, sign-in is still where this ends.
            signOutAction().catch(() => window.location.assign(ROUTES.signIn));
            break;
        }
      });
    },
    [],
  );

  const handleOpenChange = useCallback((open: boolean) => {
    setState((current) => current && { ...current, open });
  }, []);

  const value = useMemo(() => ({ openItem }), [openItem]);

  return (
    <ItemDrawerContext.Provider value={value}>
      {children}
      {state && (
        <ItemDrawer
          open={state.open}
          onOpenChange={handleOpenChange}
          summary={state.summary}
          load={state.load}
        />
      )}
    </ItemDrawerContext.Provider>
  );
};

export const useItemDrawer = (): ItemDrawerContextValue => {
  const context = useContext(ItemDrawerContext);
  if (!context) throw new Error("useItemDrawer must be used inside ItemDrawerProvider");
  return context;
};
