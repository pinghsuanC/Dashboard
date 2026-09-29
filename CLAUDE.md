# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

# Devstash

A developer knowledge hub for snippets, commands, prompts, notes, files, images, links and custom types.

## Commands

```bash
npm run dev      # dev server (Turbopack), http://localhost:3000
npm run build    # production build — also runs the TypeScript check
npm run start    # serve the production build
npm run lint     # ESLint 9 flat config; bare `eslint`, no path args needed
npm run db:migrate   # prisma migrate dev — create + apply a migration (Neon dev branch)
npm run db:deploy    # prisma migrate deploy — apply existing migrations (production)
npm run db:generate  # prisma generate — also runs on postinstall
npm run db:studio    # prisma studio
npm run db:test      # testScripts/test-db.ts — read-only DB smoke checks (not a test runner)
```

There is **no test runner configured** — no test script, and no Jest/Vitest/Playwright/Testing Library in `package.json`. Do not invent test commands; if tests are wanted, set up the harness first and record the invocation here.

For a typecheck without a full build: `npx tsc --noEmit`.

## Docs are local, and they override prior knowledge

This is Next.js 16.3.5 with React 19. The version-correct docs ship inside the repo at `node_modules/next/dist/docs/` — `01-app/01-getting-started/` for guides, `01-app/03-api-reference/` for APIs, and `01-app/02-guides/upgrading/version-16.md` for what changed. Read the relevant file before writing App Router code rather than relying on recalled Next.js conventions. This is the point of the generated block in `AGENTS.md`, and it is load-bearing — see the generated-types note below for a concrete example of an API that does not exist in older Next.

## Architecture

App Router under `src/app/`. Routes: `/` (still a placeholder) and `/dashboard`, which has its own layout (sidebar + top bar) and page.

- **`src/app/layout.tsx`** is the root layout and is required — it owns the `<html>`/`<body>` tags, the font wiring, the always-on `dark` class, and the default `metadata` export.
- **Data access lives in `src/lib/db/`** (`items.ts`, `collections.ts`, `current-user.ts`): server-side Prisma queries that return plain, UI-shaped types. Server components call these directly and pass data down; client components (e.g. the sidebar navs) only take props.
- **Queries scope themselves to the session user.** They take no `userId`; each calls `requireCurrentUserId()` (from `current-user.ts`), which reads the per-request cached `getCurrentUser()` and redirects to sign-in when there is none. Don't thread a `userId` through callers.
- **Auth is Auth.js v5 with a split config**: `src/auth.config.ts` (edge-safe, used by `src/proxy.ts`) and `src/auth.ts` (Prisma adapter, JWT sessions). The JWT carries only the user id; client components read the profile via `useCurrentUser()` from `UserProvider`, seeded by the dashboard layout.
- **Components** are grouped by feature under `src/components/` (`dashboard/`, `collections/`, `items/`, `layout/`, `shared/`). `src/components/ui/` is shadcn-generated.
- **`@/*` maps to `./src/*`** (`tsconfig.json`).
- **`public/` does not currently exist.** For favicons and social images, prefer App Router metadata file conventions — `icon.png`, `apple-icon.png`, `opengraph-image.png` placed in `src/app/` get hashed URLs and auto-generated `<link>`/`<meta>` tags. Recreate `public/` only for assets that genuinely need a stable, hand-referenced path.

### Generated route types are global — do not import them

`LayoutProps<'/'>`, `PageProps<'/route'>` and `RouteContext<'/route'>` are **globally available** helpers that Next generates from the actual folder structure into `.next/types/` and `.next/dev/types/` (both are in the `tsconfig.json` `include` array). They need no import.

Two consequences:

1. Do not "fix" `LayoutProps<'/'>` into a hand-written `{ children }: { children: React.ReactNode }`. It is the current, correct convention.
2. These types only exist after `next dev` or `next build` has run at least once. On a clean checkout, unresolved-type errors are expected until then — run a build before chasing them.

### Styling: Tailwind v4, configured in CSS

There is **no `tailwind.config.js`**, by design. Tailwind v4 is configured from `src/app/globals.css` via `@import "tailwindcss"` and `@theme` blocks; PostCSS just loads `@tailwindcss/postcss`.

`globals.css` holds the shadcn setup: it imports `tw-animate-css` and `shadcn/tailwind.css`, defines the `dark` custom variant, the color and radius tokens, and the base `body` styles. Add or change design tokens there, not in a JS config.

Fonts: `layout.tsx` loads Geist and Geist Mono via `next/font/google` into `--font-sans` / `--font-mono` on `<html>`, and the `@theme inline` block binds them to the `font-sans` / `font-mono` utilities. `--font-sans: var(--font-sans)` looks self-referential but is not a bug — `inline` writes the `var()` into the utility, which reads the value `next/font` sets.

### Class merging: the `cn` package

`cn` comes from the [`cn`](https://github.com/shadcn-ui/cn) npm package (shadcn's drop-in replacement for `clsx` + `tailwind-merge`), not a local helper. The `ui/` files import it straight from `"cn"`; `src/lib/utils.ts` re-exports it for app code. Don't reinstall `clsx`/`tailwind-merge` or rewrite `utils.ts` back to the old wrapper.

### Database: Prisma 7 + Neon

- **Pinned to Prisma 7.** npm's `latest` tag for `prisma` points at an 8.x release candidate, so a bare `npm i prisma` installs 8. Keep `prisma` and `@prisma/client` on matching `^7` versions.
- **Always `db:migrate`, never `prisma db push`** unless explicitly asked. `.env` points at the Neon dev branch; production is a separate branch and only gets `db:deploy`.
- Config is in `prisma.config.ts`, not the schema: it loads `.env` via `dotenv` (Prisma 7 no longer does) and gives the CLI `DIRECT_URL` (unpooled). The app uses the pooled `DATABASE_URL` through the `PrismaNeon` driver adapter in `src/lib/prisma.ts`, which is the only place a `PrismaClient` should be constructed.
- **Primary keys are UUID v4** (`@default(uuid())`, generated by Prisma, not a DB default; columns stay `text`). Don't hand-pick ids in seeds or fixtures. Match rows on natural keys (email, slug, name) instead.
- The client is generated into `src/generated/prisma/` (gitignored). Import it from `@/generated/prisma/client`, not `@prisma/client`. `migrate dev` no longer runs `generate` for you. Run `db:generate` after schema changes if the dev server doesn't pick them up.

### Neon MCP: development branch only

When using the `neon` MCP server, always target:

- **Project:** `stashboard` — `project_id: rough-wind-04171988`
- **Branch:** `development` — `branch_id: br-silent-firefly-b4er4xcj`

Rules:

- **Pass both `project_id` and `branch_id` explicitly on every Neon tool call**, including read-only ones. The OAuth connection is not limited to one project, and when a call leaves out `branch_id` it uses the project's default branch, which is `production`.
- **Never touch `production`** (`br-polished-voice-b487lkfo`) through the MCP. No reads, no writes, no migrations, no `reset_from_parent`, no branch or endpoint changes. Production only changes when a merge to `main` triggers `db:deploy`.
- If a task seems to need production (for example comparing schemas), stop and ask first. Only continue if I explicitly name production in that request.
- Schema changes go through `npm run db:migrate` on the dev branch, not through `run_sql` DDL or `prepare_database_migration`, so Prisma's migration history stays the source of truth.
- Ask before any destructive SQL (`DELETE`, `UPDATE`, `DROP`, `TRUNCATE`), even on `development`.

## AGENTS.md is generated — put durable guidance here instead

`AGENTS.md` content between `<!-- BEGIN:nextjs-agent-rules -->` and `<!-- END:nextjs-agent-rules -->` is written and re-upserted by `next dev` (`node_modules/next/dist/server/lib/generate-agent-files.js`). Edits inside those markers are overwritten.

That generator leaves this file alone: because `AGENTS.md` exists and hosts the block, `writeAgentFiles` returns `claudeMd: 'skipped'`. The bare `@AGENTS.md` content is only ever written when *neither* file exists. So `CLAUDE.md` is the safe place for project guidance — but keep the `@AGENTS.md` import above so the Next rules still load.
