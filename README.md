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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
