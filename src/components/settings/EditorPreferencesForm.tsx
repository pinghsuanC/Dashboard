"use client";

import { useEditorPreferences } from "@/components/session/EditorPreferencesProvider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EDITOR_FONT_SIZES, EDITOR_TAB_SIZES, EDITOR_THEMES } from "@/lib/constants/editor";
import type { EditorTheme } from "@/types/editor";

// A list below the trigger, right edges lined up. The Select's default
// ("item-aligned") lays the list over the trigger instead.
const DROPDOWN = { position: "popper", align: "end" } as const;

interface PreferenceRowProps {
  id: string;
  label: string;
  description: string;
  children: React.ReactNode;
}

const PreferenceRow = ({ id, label, description, children }: PreferenceRowProps) => (
  <div className="flex items-center justify-between gap-4">
    <div className="space-y-0.5">
      <Label htmlFor={id}>{label}</Label>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
    {children}
  </div>
);

/**
 * Each control saves as soon as it changes; there is no Save button. Values
 * come from the editor preferences context, so every code editor on the
 * page follows along at once.
 */
export const EditorPreferencesForm = () => {
  const { preferences, updatePreference } = useEditorPreferences();

  return (
    <div className="flex flex-col gap-5">
      <PreferenceRow id="editor-theme" label="Theme" description="Colours for code.">
        <Select
          value={preferences.theme}
          onValueChange={(value) => updatePreference("theme", value as EditorTheme)}
        >
          <SelectTrigger id="editor-theme" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent {...DROPDOWN}>
            {EDITOR_THEMES.map((theme) => (
              <SelectItem key={theme.value} value={theme.value}>
                {theme.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PreferenceRow>

      <PreferenceRow id="editor-font-size" label="Font size" description="Text size in the editor.">
        <Select
          value={String(preferences.fontSize)}
          onValueChange={(value) => updatePreference("fontSize", Number(value))}
        >
          <SelectTrigger id="editor-font-size" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent {...DROPDOWN}>
            {EDITOR_FONT_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}px
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PreferenceRow>

      <PreferenceRow id="editor-tab-size" label="Tab size" description="Spaces per indent.">
        <Select
          value={String(preferences.tabSize)}
          onValueChange={(value) => updatePreference("tabSize", Number(value))}
        >
          <SelectTrigger id="editor-tab-size" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent {...DROPDOWN}>
            {EDITOR_TAB_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} spaces
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PreferenceRow>

      <PreferenceRow id="editor-word-wrap" label="Word wrap" description="Wrap long lines instead of scrolling.">
        <Switch
          id="editor-word-wrap"
          checked={preferences.wordWrap}
          onCheckedChange={(checked) => updatePreference("wordWrap", checked)}
        />
      </PreferenceRow>

      <PreferenceRow id="editor-minimap" label="Minimap" description="A code overview beside the editor.">
        <Switch
          id="editor-minimap"
          checked={preferences.minimap}
          onCheckedChange={(checked) => updatePreference("minimap", checked)}
        />
      </PreferenceRow>
    </div>
  );
};
