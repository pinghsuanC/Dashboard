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
npm test             # vitest run — unit tests, single run
npm run test:watch   # vitest in watch mode
```

Tests are **Vitest 4** (`vitest.config.ts`), for server actions and utilities only, not components. Test files sit next to their source as `*.test.ts`. Vitest is pinned to `^4`: v5 needs `@types/node` 22+, and this project is on 20.

- Write tests from the feature's requirements, not from the code, and prove each can fail: break the behaviour it covers and check that it goes red.
- Database code is tested against `src/test/fake-prisma.ts`, an in-memory stand-in that keeps the cascade and `ON DELETE RESTRICT` rules, so tests assert what is stored rather than which calls were made. Mock `@/lib/prisma` with it; extend it when new code needs more of Prisma.
- The run's `TZ` is set far from UTC in `vitest.config.ts` so date code that follows the machine zone fails.

For a typecheck without a full build: `npx tsc --noEmit`.

## Docs are local, and they override prior knowledge

This is Next.js 16.3.5 with React 19. The version-correct docs ship inside the repo at `node_modules/next/dist/docs/` — `01-app/01-getting-started/` for guides, `01-app/03-api-reference/` for APIs, and `01-app/02-guides/upgrading/version-16.md` for what changed. Read the relevant file before writing App Router code rather than relying on recalled Next.js conventions. This is the point of the generated block in `AGENTS.md`, and it is load-bearing — see the generated-types note below for a concrete example of an API that does not exist in older Next.

## Architecture

App Router under `src/app/`. Routes: `/` (still a placeholder), `/dashboard` and `/profile` in the `(app)` route group, which shares the sidebar + top bar layout, and `/sign-in`, `/register`, `/forgot-password` + `/reset-password` in the `(auth)` route group, which shares a centered layout without adding a URL segment.

- **`src/app/layout.tsx`** is the root layout and is required — it owns the `<html>`/`<body>` tags, the font wiring, the always-on `dark` class, the default `metadata` export, and the Sonner `<Toaster theme="dark">` (pinned, since there is no `next-themes` provider).
- **Data access lives in `src/lib/db/`** (`items.ts`, `item-types.ts`, `collections.ts`, `profile.ts`, `current-user.ts`): server-side Prisma loaders that return plain, UI-shaped types. Inside `(app)` they are called by `getUserSession()`, except per-visit data such as recent items, which pages fetch.
- **The user session holds what rarely changes** (`src/lib/user-session.ts`, `server-only`). `getUserSession()` loads `{ user, itemTypes, itemCounts, pinnedItems, collections }`, cached per request, and is called **only by the `(app)` layout**, which runs on a full page load and on a reset, not on navigation. Items are not all in it: only counts (total, favorites, per type, counted in the database) and the pinned list. Collections are few, so all of them are, with item count and ranked types. `UserSessionProvider` (`src/components/session/`) holds it on the client; components read it with `useUserSession()` and derive display shapes with `src/lib/session-selectors.ts`. Never cache the session at module level or behind an "initialized" flag on the server: one process serves every user (a test guards this).
- **Not in the session, fetched per visit:** recent items (`getRecentItems()`, called by the dashboard page; pages re-render on navigation). Full item lists for "view all", editing and creating will load where they're needed.
- **Updating the session:** `setUser` / `setItemTypes` / `setItemCounts` / `setPinnedItems` / `setCollections` from `useUserSession()` change it locally (for optimistic CRUD; the database save runs separately, and keeping counts and collection totals in step is the caller's job). `resetProfile()` reloads it from the server: from the hook on the client (`router.refresh()`), or from `@/lib/user-session` at the end of a server action (`refresh()`). A re-sent server session always replaces local state.
- **Queries scope themselves to the session user.** They take no `userId`; each calls `requireCurrentUserId()` (from `current-user.ts`), which reads the per-request cached `getCurrentUser()` and redirects to sign-in when there is none. Don't thread a `userId` through callers.
- **Auth is Auth.js v5 with a split config**: `src/auth.config.ts` (edge-safe, used by `src/proxy.ts`) and `src/auth.ts` (Prisma adapter, JWT sessions). The JWT carries only the user id; `getCurrentUser()` (`current-user.ts`) reads the user row once per request (cached) and does two jobs: it is the auth check (guards, actions, auth pages) and the profile the user session holds (including `createdAt` and `hasPassword`; never the hash or Stripe ids). Providers are GitHub and Credentials: `auth.config.ts` holds an edge-safe Credentials placeholder that `auth.ts` replaces with the bcrypt check, and sets `pages.signIn`/`pages.error` to `/sign-in`. Sign-in, register and sign-out are server actions in `src/actions/auth.ts`; account creation lives in `src/lib/register-user.ts`, shared with `POST /api/auth/register` (kept for non-browser clients). Zod schemas live in `src/lib/auth-schemas.ts`. Redirect targets go through `safeCallbackUrl()` / `signInHref()` in `src/lib/auth-redirect.ts`.
- **Email verification is on unless `EMAIL_VERIFICATION=off`.** Check it with `isEmailVerificationEnabled()` (`src/lib/email-verification.ts`), never `process.env` directly. Off skips the Resend email on register and the unverified-user block in `authorize`; users registered while off stay unverified and get a link on their next sign-in once it's back on.
- **Auth pages call `redirectIfSignedIn()`, not bare `auth()`.** It sends a signed-in visitor into the app (their `callbackUrl`, else `/dashboard`), where the `(app)` layout loads the session. It checks the database, so a valid JWT whose user row is gone stays put instead of looping between `/sign-in` and the layout.
- **Forms are server-rendered with client islands.** Pages stay server components and pass a server action plus server-built fields to `ActionForm` (`src/components/shared/`), the one client boundary holding `useActionState`. `FormField`, `FormError` and `SubmitButton` are small client leaves that read its state. Actions return `FormState` (`src/types/forms.ts`). Prefer this over a whole `"use client"` form.
- **Components** are grouped by feature under `src/components/` (`auth/`, `dashboard/`, `collections/`, `items/`, `layout/`, `shared/`). `src/components/ui/` is shadcn-generated.
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
