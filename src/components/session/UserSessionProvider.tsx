"use client";

import { useRouter } from "next/navigation";
import {
  type SetStateAction,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";

import type { UserSession } from "@/lib/user-session";

type Setter<T> = (action: SetStateAction<T>) => void;

interface UserSessionContextValue extends UserSession {
  /**
   * Local updates, for showing a change before the database has it (the CRUD
   * phase saves in the background). They take a value or an updater, like
   * `useState` setters.
   */
  setUser: Setter<UserSession["user"]>;
  setItemTypes: Setter<UserSession["itemTypes"]>;
  setItemCounts: Setter<UserSession["itemCounts"]>;
  setPinnedItems: Setter<UserSession["pinnedItems"]>;
  setCollections: Setter<UserSession["collections"]>;
  /** Reloads the whole session from the server, e.g. after a profile edit. */
  resetProfile: () => void;
  /** True while a reset is in flight. */
  isResetting: boolean;
}

const UserSessionContext = createContext<UserSessionContextValue | null>(null);

interface UserSessionProviderProps {
  session: UserSession;
  children: React.ReactNode;
}

/**
 * Holds the user session on the client. Seeded once from the `(app)` layout,
 * which stays mounted across navigation, so moving between pages loads
 * nothing: pages read and derive from this instead of querying.
 *
 * The server's copy wins when it is sent again. The layout only re-renders on
 * a full load, a `resetProfile()`, or a server action that calls `refresh()`,
 * and each of those means "the database is the truth now", so a new `session`
 * prop replaces local state. Between those, the setters are the source of
 * truth. Known edge for the CRUD phase: a refresh landing while a background
 * save is still in flight would briefly show the pre-save data.
 */
export const UserSessionProvider = ({ session, children }: UserSessionProviderProps) => {
  const router = useRouter();
  const [isResetting, startTransition] = useTransition();
  const [state, setState] = useState(session);
  const [loadedFrom, setLoadedFrom] = useState(session);

  // React's "adjust state when a prop changes" pattern: compared during
  // render, so the replaced state paints in the same pass as the new prop.
  if (session !== loadedFrom) {
    setLoadedFrom(session);
    setState(session);
  }

  const sliceSetter = useCallback(
    <K extends keyof UserSession>(key: K): Setter<UserSession[K]> =>
      (action) =>
        setState((current) => ({
          ...current,
          [key]:
            typeof action === "function"
              ? (action as (previous: UserSession[K]) => UserSession[K])(current[key])
              : action,
        })),
    [],
  );

  const setters = useMemo(
    () => ({
      setUser: sliceSetter("user"),
      setItemTypes: sliceSetter("itemTypes"),
      setItemCounts: sliceSetter("itemCounts"),
      setPinnedItems: sliceSetter("pinnedItems"),
      setCollections: sliceSetter("collections"),
    }),
    [sliceSetter],
  );

  const resetProfile = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  const value = useMemo(
    () => ({ ...state, ...setters, resetProfile, isResetting }),
    [state, setters, resetProfile, isResetting],
  );

  return <UserSessionContext value={value}>{children}</UserSessionContext>;
};

/** The signed-in user's session. Only inside the `(app)` layout. */
export const useUserSession = () => {
  const value = useContext(UserSessionContext);
  if (!value) throw new Error("useUserSession must be used inside UserSessionProvider");
  return value;
};
