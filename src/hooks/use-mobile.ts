import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Deviates from the stock shadcn hook, which sets state inside an effect and
// trips `react-hooks/set-state-in-effect`. A media query is an external store,
// so useSyncExternalStore is the tear-free way to read it. Re-apply this if
// `shadcn add` ever overwrites the file.
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

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
