import * as React from "react"

const MOBILE_BREAKPOINT = 768

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
