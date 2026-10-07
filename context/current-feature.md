# Features

<!-- One `##` section per feature, in build order. Remove a section once it lands and is recorded in History. -->

---

## History

<!-- Keep this updated, earliest to latest. -->

- **2026-09-19** — Initialized Next.js 16 project: React 19, TypeScript, Tailwind v4, App Router.
- **2026-09-20** — Dashboard phase 1: shadcn/ui set up, `/dashboard` shell with top bar, dark mode by default.
- **2026-09-20** — Dashboard phase 2: collapsible sidebar (types, collections, user footer), mobile drawer, live top-bar trigger.
- **2026-09-20** — Dashboard phase 3: main area with 4 stat cards, collections grid, pinned items, 10 recent items. Components switched to arrow functions.
- **2026-09-23** — Database phase 1: set up Neon and Prisma, updated schema, seeded database.
- **2026-09-25** — Database phase 2: dashboard and sidebar loaded from the database.
- **2026-09-28** — Sidebar: PRO badge on File and Image types.
- **2026-09-28** — Audit quick wins: sidebar and dashboard fixes, robustness guards, index migration.
- **2026-09-29** — Auth phase 1: GitHub sign-in, protected dashboard, session user profile; demo user removed.
- **2026-09-29** — Auth phase 2: email/password sign-in and `/api/auth/register`, bcrypt hashing, Zod validation.
- **2026-09-29** — Auth phase 3: custom sign-in and register pages, sidebar sign-out, shared avatar, register toast.
- **2026-09-30** — Email verification: Resend link on register, unverified sign-in blocked with auto-resend, email templates module.
- **2026-10-01** — Email verification toggle: `EMAIL_VERIFICATION=off` skips the verification email and sign-in block; on by default.
- **2026-10-01** — Forgot password: emailed 1-hour reset link via `PasswordResetToken`, reset verifies the email, no account enumeration.
- **2026-10-01** — Profile page: `/profile` in shared `(app)` layout with user info, usage stats, change password and delete account; Vitest set up.
- **2026-10-01** — User session: profile, item counts, pinned items and collections loaded once in the `(app)` layout with local setters and `resetProfile()`; recent items fetched per visit.
- **2026-10-03** — Rate limiting: Upstash sliding-window limits on sign-in, register, forgot/reset password and verification resend; fails open; toast in forms, 429 with `Retry-After` from the API. Unknown-email sign-in now costs a bcrypt compare.
- **2026-10-03** — Constants: user-facing strings and tunable config moved to `src/lib/constants/`; brand is Stashboard with one `Page | Stashboard` title format; email and page expiry text derived from the link lifetimes.
- **2026-10-03** — Items list view: `/items/[type]` grid of one type's items with type-colored cards, streamed behind a skeleton; mobile drawer closes on navigate.
- **2026-10-03** — Test coverage: unit tests for email verification, email sending, form errors and the register and verify-email routes.
- **2026-10-04** — Item drawer: right-side detail sheet opened from item cards, item body loaded on click from `/api/items/[id]`; a missing or another user's item signs out.
- **2026-10-06** — Item edit: drawer edit mode with per-type fields from a constants map, `updateItem` action with Zod validation, tags matched by slug; lists and session refresh on save.
- **2026-10-06** — Service refactor: `services/` owns every outside connection (Prisma, Resend, Upstash) and the auth service; `lib/db` stays the interface with the profile check; `lib/` grouped by area; a boundary test enforces the layers.
- **2026-10-06** — Refactored types into `src/types/`.
