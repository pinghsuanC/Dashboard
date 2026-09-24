# Features

<!-- One `##` section per feature, in build order. Remove a section once it lands and is recorded in History. -->

---

## History

<!-- Keep this updated, earliest to latest. -->

- **2026-09-19** — Initialized Next.js 16 project: React 19, TypeScript, Tailwind v4, App Router.
- **2026-09-20** — Dashboard phase 1: shadcn/ui set up, `/dashboard` shell with top bar, dark mode by default.
- **2026-09-20** — Dashboard phase 2: collapsible sidebar (types, collections, user footer), mobile drawer, live top-bar trigger.
- **2026-09-20** — Dashboard phase 3: main area with 4 stat cards, collections grid, pinned items, 10 recent items. Components switched to arrow functions.
- **2026-09-23** — Database: Prisma 7 + Neon Postgres, initial schema and `init` migration applied to the dev branch. No `Session` model (JWT strategy).
- **2026-09-23** — Database seed: `ItemType.color` + `Collection.isFavorite` migration; idempotent `db:seed` with 7 system types and a demo user mirroring the mock data.
