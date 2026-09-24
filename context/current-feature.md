# Features

<!-- One `##` section per feature, in build order. Remove a section once it lands and is recorded in History. -->

## Database phase 2: dashboard collections from the database

**Status:** In progress
**Spec:** `context/features/2. database/data-replacement-spec.md`

Replace the mock collections in the dashboard main area with real data from Neon via Prisma. Same look: the 6 recent collection cards.

### Goals

- `src/lib/db/collections.ts` with the collection fetching functions
- Fetch directly in the server component (`src/app/dashboard/page.tsx`)
- Card border color from the most-used item type in each collection
- Small icons for every item type in the collection
- Item counts and the collection stats come from the database
- Keep the current design

### Notes

- Out of scope: the items under the collections, the sidebar (both stay on mock data for now)
- Reference screenshot: `context/references/dashboard-ui-main.png`

---

## History

<!-- Keep this updated, earliest to latest. -->

- **2026-09-19** — Initialized Next.js 16 project: React 19, TypeScript, Tailwind v4, App Router.
- **2026-09-20** — Dashboard phase 1: shadcn/ui set up, `/dashboard` shell with top bar, dark mode by default.
- **2026-09-20** — Dashboard phase 2: collapsible sidebar (types, collections, user footer), mobile drawer, live top-bar trigger.
- **2026-09-20** — Dashboard phase 3: main area with 4 stat cards, collections grid, pinned items, 10 recent items. Components switched to arrow functions.
- **2026-09-23** — Database phase 1: set up Neon and Prisma, updated schema, seeded database.
