# Features

<!-- One `##` section per feature, in build order. Remove a section once it lands and is recorded in History. -->

<!-- Next part of auth: local/prod callback switching (via env settings). -->

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
