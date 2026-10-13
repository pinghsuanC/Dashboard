"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { updateEditorPreferences } from "@/actions/account";
import { useUserSession } from "@/components/session/UserSessionProvider";
import { EDITOR_PREFERENCES_SAVED } from "@/lib/constants/messages/account";
import { SOMETHING_WENT_WRONG } from "@/lib/constants/messages/common";
import { EDITOR_PREFERENCES_TOAST_ID } from "@/lib/constants/ui";
import type { EditorPreferences } from "@/types/editor";

interface EditorPreferencesContextValue {
  preferences: EditorPreferences;
  /**
   * Shows the change at once and saves it. A failed save puts back what the
   * database last confirmed.
   */
  updatePreference: <K extends keyof EditorPreferences>(key: K, value: EditorPreferences[K]) => void;
}

const SAVE_FAILED = { success: false, error: { message: SOMETHING_WENT_WRONG } } as const;

const EditorPreferencesContext = createContext<EditorPreferencesContextValue | null>(null);

/**
 * Holds the user's editor preferences on the client, for the settings page to
 * change and every code editor to follow. Seeded from the user session, and
 * reseeded when the server sends it again, like `UserSessionProvider`.
 *
 * A save doesn't write back into the user session: that would reseed this
 * state from the confirmed value and undo a newer change still being saved.
 * The database has every save, so the next session load agrees anyway.
 */
export const EditorPreferencesProvider = ({ children }: { children: React.ReactNode }) => {
  const saved = useUserSession().user.editorPreferences;
  const [preferences, setPreferences] = useState(saved);
  const [loadedFrom, setLoadedFrom] = useState(saved);
  // What the database last confirmed: where a failed save goes back to.
  const confirmed = useRef(saved);
  const latestSave = useRef(0);

  if (saved !== loadedFrom) {
    setLoadedFrom(saved);
    setPreferences(saved);
  }

  useEffect(() => {
    confirmed.current = saved;
  }, [saved]);

  const updatePreference = useCallback(
    async <K extends keyof EditorPreferences>(key: K, value: EditorPreferences[K]) => {
      const next = { ...preferences, [key]: value };
      setPreferences(next);
      const save = ++latestSave.current;

      // A dropped connection throws rather than answering; treat it as a failed save.
      const result = await updateEditorPreferences(next).catch(() => SAVE_FAILED);
      if (result.success) {
        confirmed.current = result.data;
        toast.success(EDITOR_PREFERENCES_SAVED, { id: EDITOR_PREFERENCES_TOAST_ID });
      } else {
        // Each save sends the whole set, so a newer one still on its way
        // carries this change's fix too: only the latest failure reverts.
        if (save === latestSave.current) setPreferences(confirmed.current);
        toast.error(result.error.message, { id: EDITOR_PREFERENCES_TOAST_ID });
      }
    },
    [preferences],
  );

  const value = useMemo(() => ({ preferences, updatePreference }), [preferences, updatePreference]);

  return <EditorPreferencesContext value={value}>{children}</EditorPreferencesContext>;
};

/** The user's editor preferences. Only inside the `(app)` layout. */
export const useEditorPreferences = () => {
  const value = useContext(EditorPreferencesContext);
  if (!value) throw new Error("useEditorPreferences must be used inside EditorPreferencesProvider");
  return value;
};
