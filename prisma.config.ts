import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env on its own, hence the dotenv import above.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Prisma 7 never runs this automatically after migrate; use `npm run db:seed`.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The CLI (migrate, studio) uses the direct, unpooled Neon connection:
    // migrations need session-level features that PgBouncer doesn't keep.
    // The app itself connects through the pooled DATABASE_URL (src/lib/prisma.ts).
    //
    // Deviation from the Prisma docs: process.env instead of env("DIRECT_URL").
    // env() throws when the variable is unset, which would break the
    // `postinstall` generate on any machine without a .env (fresh clone, CI).
    // generate never connects, so only migrate/studio need the URL, and they
    // fail on their own without it.
    url: process.env.DIRECT_URL,
  },
});
