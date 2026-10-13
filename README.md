This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Future Plans

Deferred work, to pick up in the polishing phase.

- **Attachments for every item type.** Let any item (a snippet, a note, ...) carry its own uploaded files, owned by one item, never shared. An `Attachment` table (`userId`, `itemId`, `key`, `name`, `size`, `mimeType`, cascading with its item) replaces the `Item.file*` columns; the storage service is reused as is. Open questions: do the File and Image types stay (as items with a required attachment)? Max attachments per item, and 5 MB per file or per item? Which file types attachments allow? Do it early, before production holds many uploads, so the migration moves little data.
- **Delete a user's R2 files with their account.** Deleting an account cascades their items in the database but leaves their uploads in R2. Delete everything under the `users/{userId}/` prefix (after the database delete succeeds), so the bucket holds no orphans.
- **Mitigate ignored audit warnings.** CI's dependency audit allowlists reviewed advisories in `audit-ci.jsonc` (braces via the shadcn CLI, deepmerge-ts and mysql2 via the Prisma CLI). Two gaps remain: a fix landing goes unnoticed until someone reads the unused-entry warning, and a reviewed package reaching the app another way is still accepted. Add a `.github/dependabot.yml` (npm and GitHub Actions, weekly, skipping Prisma 8) so fixes arrive as PRs, and scope each entry to its dependency path (e.g. `GHSA-vfj7-8cjw-p6xm|shadcn>fast-glob>micromatch>braces`) so a new path fails CI.
- **Rework the user session and its caching.** `getUserSession()` loads everything at once (profile, types, counts, pinned items, collections, and up to 50 search items), and every create, edit or delete reloads all of it through `resetProfile()`, even when only one slice changed. The search items also ride along on every full page load, used or not. Options to weigh: refresh only the slice that changed, or update it locally with the session setters (they exist but no save uses them yet); load the search items when the palette first opens instead of with the session; and cache per-user reads across requests (Next's `"use cache"` with tags, invalidated by the actions) without ever sharing one user's data with another.
- **Search past the preloaded items.** The search palette searches the session's `searchItems` in the browser, and `getSearchItems()` loads up to `SEARCH_ITEM_LIMIT` (50) of them, newest first. The cap is kept small so the session stays light, which means anything older than the newest 50 can't be found. When a search finds nothing locally, fall back to a server search: a debounced, rate-limited request to a user-scoped route or action that matches the same fields (title, type, description, file name, tags) in the database and returns item summaries, shown in the palette as they arrive. Open questions: whether to also query the server when there are a few local matches but the cap was hit, and whether Postgres full-text search or `ILIKE` on indexed columns is enough.
- **Paginate each collection section on its own.** `/collections/[slug]` loads one page of the collection's items (`ITEMS_PER_PAGE`, newest by `updatedAt`) and splits it into Items, Files and Images in memory, so a page's mix of types varies and each section shows only part of its items. Instead, run one query per section (filtered by type, each with its own `skip`/`take` and count) and give each section its own page links and URL parameter (e.g. `?items=2&files=1&images=3`), with section totals from the counts rather than the page. The section headers lost their `(n)` counts when pagination landed, because a page's count is only part of the section; each section's own count query restores them.
- **Count collection cards in the database.** `collectionCardSelect` (`src/lib/db/collections.ts`) fetches one join row, with its item's type, for every item in every collection, then counts and ranks the types in JS. `getSessionCollections()` runs it on every full page load inside `getUserSession()`, so the rows grow with total item-to-collection links. Use `_count` for the item count and one grouped query (`collectionId`, `typeId`, `count(*)` over `CollectionItem` joined to `Item`, scoped to the user) for the ranked types.
- **Decide what `/` does.** It is still the "Project Start" placeholder and the proxy doesn't guard it. It is planned as the public marketing homepage, so a proxy guard would have to come off again, and the auth layout's logo links to it. Until the homepage exists, consider having the page redirect to `/dashboard`, which the proxy already guards.
- **Share the editors' copy feedback.** `CodeEditor` and `MarkdownEditor` each declare `COPIED_ICON_MS` and their own copied-icon timer and copy handler. Move the constant to `constants/ui.ts` and extract a `useCopyFeedback(value)` hook returning `{ copied, copy }` in `components/items/` (not `src/hooks/`, which is shadcn's).
- **Move tuning values into constants.** `MAX_PAGE_LINKS` (`lib/helpers/pagination.ts`), `FIELD_MATCH_WEIGHT` (`lib/search/search.ts`) and the editors' padding are declared inline. `pageLinks()` also hard-codes thresholds (4, 5, 3) derived from 7, so changing `MAX_PAGE_LINKS` alone breaks its layout: derive them, with tests first.
- **Split the large item components.** `ItemDrawer` (~330 lines) into `ItemDrawerActions`, `ItemDrawerBody`, `ImagePreview` and `ItemMeta`, leaving the sheet shell and edit toggle; `ItemCreateDialog` (~230 lines) into an `ItemTypePicker` and a `useCreateItem` hook for the submit, upload and toast flow.
- **Share repeated UI.** `ItemDeleteDialog` and `CollectionDeleteDialog` are ~80% the same: one `ConfirmDeleteDialog` in `components/shared/`. The image grid, file list and item grid markup is repeated in `/items/[type]` and `/collections/[slug]`: `ImageGrid`, `FileList` and `ItemGrid` in `components/items/`. `CollectionDialog` hand-writes the label, error and `aria-describedby` wiring that `ItemFormFields`' `Field` helper already does: move `Field` to `components/shared/` and use it in both.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
