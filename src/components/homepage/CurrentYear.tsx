"use client";

import { useSyncExternalStore } from "react";

type CurrentYearProps = {
  /** The year the server rendered with: `/` is prerendered, so it's the build year. */
  fallback: number;
};

// The year never needs a re-render while the page is open, so nothing to subscribe to.
const subscribe = () => () => {};
const browserYear = () => new Date().getFullYear();

/**
 * The visitor's current year. React uses `fallback` (the server snapshot) for
 * the prerender and for hydration, so they match, then the browser's year
 * right after. Changes at most once, on a page built before a New Year.
 */
export const CurrentYear = ({ fallback }: CurrentYearProps) => {
  const year = useSyncExternalStore(subscribe, browserYear, () => fallback);
  return <>{year}</>;
};
