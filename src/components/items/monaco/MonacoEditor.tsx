"use client";

import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api";
// The editor's own features (find, folding, clipboard, context menu, ...) and
// the services they need. `editor.api` alone has none, and a feature that
// arrives without its service fails at runtime. This is `editor.main` minus
// the TypeScript, CSS and HTML language services, which we don't use.
import "monaco-editor/features/register.all";
// Registers every basic language; each one's tokenizer is its own chunk,
// loaded the first time an editor uses it.
import "monaco-editor/languages/definitions/register.all";
import "monaco-editor/language/json/monaco.contribution";

/*
 * Monaco is bundled, not fetched from a CDN: the editor works offline and
 * behind a strict CSP, and its version is the one in package.json. This module
 * touches `window` as it loads, so `CodeEditor` imports it with `next/dynamic`
 * and `ssr: false`, which also keeps Monaco out of every page's first load.
 *
 * Workers: Monaco asks `MonacoEnvironment` for one per label. Only JSON has a
 * language service here; every other label gets the editor core worker.
 */
self.MonacoEnvironment = {
  getWorker: (_workerId, label) =>
    label === "json"
      ? new Worker(new URL("./json.worker.ts", import.meta.url), { type: "module" })
      : new Worker(new URL("./editor.worker.ts", import.meta.url), { type: "module" }),
};

// Hand the bundled copy to the React wrapper so it never loads one itself.
loader.config({ monaco });

export { default } from "@monaco-editor/react";
