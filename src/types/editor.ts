/** The code editor themes a user can pick on the settings page. */
export type EditorTheme = "vs-dark" | "monokai" | "github-dark";

/**
 * How the user's code editors look and behave, saved on the user row and
 * held on the client by `EditorPreferencesProvider`. A type, not an
 * interface, so Prisma accepts it as a JSON object without a cast.
 */
export type EditorPreferences = {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  theme: EditorTheme;
};
