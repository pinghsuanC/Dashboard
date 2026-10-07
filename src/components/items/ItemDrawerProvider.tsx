"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { signOutAction } from "@/actions/auth";
import { ItemDrawer, type ItemDrawerLoad } from "@/components/items/ItemDrawer";
import { ROUTES } from "@/lib/constants/routes";
import type { ItemDetail, ItemSummary } from "@/lib/db/items";
import { fetchItemDetail } from "@/lib/items/fetch-item-detail";

interface ItemDrawerContextValue {
  /** Opens the drawer on this item at once, then loads its body. */
  openItem: (summary: ItemSummary) => void;
}

const ItemDrawerContext = createContext<ItemDrawerContextValue | null>(null);

interface DrawerState {
  /** Which open this is: the drawer's `key`, so each open starts in view mode. */
  request: number;
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
      setState({ request, summary, load: { status: "loading" }, open: true });

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

  // The saved copy replaces both halves, so the header shows it too. Card
  // lists and the session refresh from the action's own `resetProfile()`.
  // A save outlives its form: closed mid-save and another item opened, its
  // result must not land on that item, so both check the id first.
  const handleSaved = useCallback((item: ItemDetail) => {
    setState((current) =>
      current?.summary.id === item.id
        ? { ...current, summary: item, load: { status: "ok", item } }
        : current,
    );
  }, []);

  const handleGone = useCallback((id: string) => {
    setState((current) => (current?.summary.id === id ? { ...current, open: false } : current));
  }, []);

  const value = useMemo(() => ({ openItem }), [openItem]);

  return (
    <ItemDrawerContext.Provider value={value}>
      {children}
      {state && (
        <ItemDrawer
          key={state.request}
          open={state.open}
          onOpenChange={handleOpenChange}
          summary={state.summary}
          load={state.load}
          onSaved={handleSaved}
          onGone={handleGone}
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
