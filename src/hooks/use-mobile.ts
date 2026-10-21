import * as React from "react"

// Tailwind's `lg`, not shadcn's 768 (`md`): below it the sidebar is a sheet.
// At 768 a docked 16rem sidebar left the page about 512px and squeezed the
// top bar's search box to a stub. Keep in step with the `lg:` classes in
// `components/ui/sidebar.tsx` and `components/layout/TopBar.tsx`.
const MOBILE_BREAKPOINT = 1024

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

/** No viewport on the server — assume desktop and let hydration correct it. */
function getServerSnapshot() {
  return false
}

/**
 * Deviates from the hook `shadcn add sidebar` generates. That version holds
 * `useState<boolean | undefined>` and calls `setIsMobile(...)` inside a
 * `useEffect` body, which fails `npm run lint` under Next 16:
 *
 *   error  Calling setState synchronously within an effect can trigger
 *          cascading renders  react-hooks/set-state-in-effect
 *
 * A media query is an external store, so `useSyncExternalStore` is both the
 * fix and the right primitive — no cascading render, and no undefined first
 * pass. Re-apply this if `shadcn add` ever overwrites the file.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
