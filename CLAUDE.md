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
npm run db:seed      # prisma/seed.ts — 7 system types + demo user from src/lib/mock-data.ts; idempotent
npm run db:generate  # prisma generate — also runs on postinstall
npm run db:studio    # prisma studio
```

There is **no test runner configured** — no test script, and no Jest/Vitest/Playwright/Testing Library in `package.json`. Do not invent test commands; if tests are wanted, set up the harness first and record the invocation here.

For a typecheck without a full build: `npx tsc --noEmit`.

## Docs are local, and they override prior knowledge

This is Next.js 16.3.5 with React 19. The version-correct docs ship inside the repo at `node_modules/next/dist/docs/` — `01-app/01-getting-started/` for guides, `01-app/03-api-reference/` for APIs, and `01-app/02-guides/upgrading/version-16.md` for what changed. Read the relevant file before writing App Router code rather than relying on recalled Next.js conventions. This is the point of the generated block in `AGENTS.md`, and it is load-bearing — see the generated-types note below for a concrete example of an API that does not exist in older Next.

## Architecture

App Router under `src/app/`. Currently only the root layout and the `/` route exist, so most structural decisions are still open.

- **`src/app/layout.tsx`** is the root layout and is required — it owns the `<html>`/`<body>` tags, the font wiring, and the default `metadata` export.
- **`@/*` maps to `./src/*`** (`tsconfig.json`).
- **`public/` does not currently exist.** For favicons and social images, prefer App Router metadata file conventions — `icon.png`, `apple-icon.png`, `opengraph-image.png` placed in `src/app/` get hashed URLs and auto-generated `<link>`/`<meta>` tags. Recreate `public/` only for assets that genuinely need a stable, hand-referenced path.

### Generated route types are global — do not import them

`LayoutProps<'/'>`, `PageProps<'/route'>` and `RouteContext<'/route'>` are **globally available** helpers that Next generates from the actual folder structure into `.next/types/` and `.next/dev/types/` (both are in the `tsconfig.json` `include` array). They need no import.

Two consequences:

1. Do not "fix" `LayoutProps<'/'>` into a hand-written `{ children }: { children: React.ReactNode }`. It is the current, correct convention.
2. These types only exist after `next dev` or `next build` has run at least once. On a clean checkout, unresolved-type errors are expected until then — run a build before chasing them.

### Styling: Tailwind v4, configured in CSS

There is **no `tailwind.config.js`**, by design. Tailwind v4 is configured from `src/app/globals.css` via `@import "tailwindcss"` and `@theme` blocks; PostCSS just loads `@tailwindcss/postcss`.

`globals.css` has been deliberately stripped to the bare `@import "tailwindcss"` — no color tokens, no dark-mode block, no `body` rule. Tailwind's own defaults (preflight plus its stock theme tokens, in `node_modules/tailwindcss/theme.css`) are therefore what is in effect. Add design tokens back in a `@theme` block in that file, not a JS config.

**Known loose end:** `layout.tsx` still loads Geist and Geist_Mono via `next/font/google` and sets `--font-geist-sans` / `--font-geist-mono` on `<html>`, but the `@theme inline` block that bound those variables to the `font-sans` / `font-mono` utilities was removed with the rest of globals.css. The fonts are fetched but never rendered, and `font-sans` now resolves to Tailwind's default stack. Either rebind them in `@theme` or drop the `next/font/google` import.

### Database: Prisma 7 + Neon

- **Pinned to Prisma 7.** npm's `latest` tag for `prisma` points at an 8.x release candidate, so a bare `npm i prisma` installs 8. Keep `prisma` and `@prisma/client` on matching `^7` versions.
- **Always `db:migrate`, never `prisma db push`** unless explicitly asked. `.env` points at the Neon dev branch; production is a separate branch and only gets `db:deploy`.
- Config is in `prisma.config.ts`, not the schema: it loads `.env` via `dotenv` (Prisma 7 no longer does) and gives the CLI `DIRECT_URL` (unpooled). The app uses the pooled `DATABASE_URL` through the `PrismaNeon` driver adapter in `src/lib/prisma.ts`, which is the only place a `PrismaClient` should be constructed.
- The client is generated into `src/generated/prisma/` (gitignored). Import it from `@/generated/prisma/client`, not `@prisma/client`. `migrate dev` no longer runs `generate` for you. Run `db:generate` after schema changes if the dev server doesn't pick them up.

## AGENTS.md is generated — put durable guidance here instead

`AGENTS.md` content between `<!-- BEGIN:nextjs-agent-rules -->` and `<!-- END:nextjs-agent-rules -->` is written and re-upserted by `next dev` (`node_modules/next/dist/server/lib/generate-agent-files.js`). Edits inside those markers are overwritten.

That generator leaves this file alone: because `AGENTS.md` exists and hosts the block, `writeAgentFiles` returns `claudeMd: 'skipped'`. The bare `@AGENTS.md` content is only ever written when *neither* file exists. So `CLAUDE.md` is the safe place for project guidance — but keep the `@AGENTS.md` import above so the Next rules still load.
