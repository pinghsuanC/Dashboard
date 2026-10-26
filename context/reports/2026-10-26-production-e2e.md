# Production end-to-end test (2026-10-26)

**Status:** Completed

A full manual pass over the live site at https://stashboard-kohl.vercel.app/ in a browser, covering auth, item and collection CRUD, Stripe sandbox checkout and plan gating. Findings are recorded here; fixes for anything broken become their own features.

### Goals

- Confirm every main user flow works on the production deploy, not just locally.
- Confirm the Free plan limits and the Pro upgrade behave as the billing features describe.
- Leave a written list of what passed, what failed, and how to reproduce each failure.

### Requirements

1. **Auth**
   - Register with email and password (email verification is off in production), land in the app.
   - Sign out, sign back in; a wrong password is refused with the generic message.
   - Registering a taken email answers like a new one (no account enumeration).
   - GitHub sign-in completes and lands on `/dashboard`.
   - Signed-out visits to `/dashboard`, `/items/snippets`, `/collections` redirect to `/sign-in`; a signed-out `/api/items/<id>` answers a JSON 401.
   - Signed-in visits to `/sign-in` and `/register` go to `/dashboard`.
   - Change password in `/settings` signs out other sessions.
2. **Items (CRUD)**
   - Create one of each free type (snippet, command, prompt, note, link) from the New Item dialog, with tags and a collection.
   - Open each in the drawer; edit title, content, tags, collections; changes show in lists, sidebar counts and search.
   - Favourite and pin toggles save and show on `/favorites` and `/pinned`.
   - Delete from the drawer; it leaves lists, counts and search.
   - Another account cannot open the first account's item (drawer 404 signs out).
3. **Collections (CRUD)**
   - Create, rename (page follows the new slug), favourite, delete (items kept).
   - Duplicate name is a field error.
4. **Plan gating (Free)**
   - Picking File or Image as Free opens the "Pro is needed" dialog.
   - The 4th collection is refused with the upgrade dialog (Free limit 3).
   - The item limit (50) is refused with the upgrade dialog, if practical to reach.
5. **Payment (Stripe sandbox)**
   - Upgrade from the dialog redirects to Stripe Checkout (sandbox), monthly and yearly both offered.
   - Paying with a Stripe test card returns to the app as Pro; PRO tags drop, File and Image unlock.
   - Upload a file and an image as Pro; preview, download and delete work.
   - An abandoned checkout leaves the account Free.
   - Delete account on a Pro account cancels the subscription (check in the Stripe sandbox dashboard).
6. **Report**
   - Record each check as pass or fail with steps to reproduce; note console and network errors seen.
7. **Cleanup**
   - Delete every item and collection the test created (R2 objects go with their file and image items).
   - Cancel any subscription still open; the Stripe sandbox shows no active subscription or unpaid checkout left by the test accounts.
   - Delete test1, test2 and test3 through Settings → Delete account; signing in to each afterwards fails.
   - GitHub account: ask the user whether to delete it or keep it.
   - Sign out of the browser pane at the end.

### Results

**Signed out (2026-10-25)**

- Pass: `/dashboard`, `/items/snippets`, `/collections`, `/settings`, `/favorites`, `/pinned`, `/profile` redirect to `/sign-in?callbackUrl=…`.
- Pass: signed-out `GET /api/items/<id>` answers JSON 401.
- Pass: `/sign-in`, `/register`, `/forgot-password`, `/reset-password` render with their forms.
- Pass: `callbackUrl` of `https://evil.example` or `//evil.example` falls back to `/dashboard`; `/collections` is kept.
- **Fail:** an unsigned `POST /api/billing/stripe/webhook` answers 500 (`Webhook handling failed`), not 400. The route returns 400 for a bad signature, so a 500 before verifying means `parseWebhook` threw `BillingNotConfiguredError`: a Stripe setting (likely `STRIPE_WEBHOOK_SECRET`) is missing in the Vercel production env. Real Stripe events will fail too and checkouts won't settle by webhook. Check Vercel logs for "Webhook can't be verified; missing settings".
  - **Fixed during the run:** Stripe env vars were not set in Vercel production and no webhook destination existed. User added the four `STRIPE_*` vars, a destination for the two checkout events at `/api/billing/stripe/webhook` (no trailing slash), and redeployed; the unsigned POST now answers 400 `Invalid signature`.

**test1, Free (2026-10-25)**

- Pass: signed-in visits to `/sign-in` and `/register` go to `/dashboard`; `/sign-in?callbackUrl=/collections` goes to `/collections`.
- Pass: created collection E2E Alpha and one each of snippet (Monaco, language, tags, collection), link, note (Markdown preview renders), command, prompt; stats, Recent, collection count and success toast update each time.
- Pass: drawer shows content, tags, collections, dates; Favorite and Pin save and show on `/favorites`, `/pinned` and the dashboard Pinned section.
- Pass: drawer edit changes title and tags and removes a collection; lists, type page and collection page follow.
- Pass: Ctrl+K palette fuzzy-matches `snipet edt` and Enter opens the drawer.
- Pass: delete asks first naming the item; item leaves lists and counts.
- Pass: duplicate collection name (`e2e alpha` vs `E2E Alpha`) is a field error.
- Pass: collection created as favourite shows in favourite counts; star on the collection page adds it to `/favorites`.
- Pass: rename follows the new slug; old slug and `..%2Fadmin` answer 404.
- Pass: deleting a collection keeps its item.
- Pass: 4th collection refused with "Pro is needed to continue" ($72/year, $8/month).
- Pass: picking File as Free opens the Pro dialog.
- Pass: $8/month redirects to Stripe Checkout (sandbox, email prefilled); the back link returns to `/settings?billing=canceled`; still Free afterwards.
- Not run: the 50-item limit (needs 46 more items by hand; covered by unit tests).
- Minor: Checkout shows the merchant as "Dashboard sandbox"; set the Stripe account's public business name to Stashboard.
- Minor: dates show Oct 26 while the user's local date is Oct 25 (`DATE_TIME_ZONE = "UTC"` in `lib/constants/locale.ts`, by design so server and browser agree); expected, not a bug.
- Minor: the drawer fetched `GET /api/items/<id>` twice on one open.
- Known/deferred: `/settings?billing=canceled` shows no message; dashboard Recent "View all" links to `/items`.
- Stale doc: `context/project-overview.md` still lists `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`; hosted Checkout needs none.
- Pass: sign out from Profile clears the session; `/dashboard` redirects again.

**test3, cross-account (2026-10-25)**

- Pass: test1's item `GET /api/items/<id>` answers 404 `{"error":"Not found"}`, byte-for-byte the same as a missing id.
- Pass: test1's item file route `/api/items/<id>/file` answers 404.
- Pass: test1's `/collections/e2e-alpha` answers 404 for test3.
- Pass: test3's dashboard is empty (no counts, collections or items from test1).
- Pass: test3 can create its own "E2E Alpha"; `/collections/e2e-alpha` then shows test3's (names unique per user only).

**test2, Pro (2026-10-25)**

- Pass: $72/year redirects to Stripe Checkout ($72.00 per year, $6.00/month billed annually, email prefilled); after the user paid with the 4242 test card it returned to `/settings?billing=success`.
- Pass: test2 is Pro after the return: PRO tags gone from Files and Images in the New Item dialog.
- Pass: File type accepts a `.txt`, item saved, `/items/files` lists name, size and date; the drawer detail never carries `fileKey` or the storage path.
- **Fail:** the browser's PUT to R2 is blocked by CORS: `stashboard-prod` bucket has no rule allowing origin `https://stashboard-kohl.vercel.app`. The item is saved with file fields (known gap, toast `FILE_UPLOAD_FAILED`), but `/api/items/<id>/file` answers 404 (`NoSuchKey`). Fix: R2 bucket CORS rule allowing `PUT` from the production origin with header `content-type`.
- Pass: the 404 from the file route still carries the sandbox CSP and `nosniff`.
  - **Fixed during the run:** the bucket's CORS policy allowed only `GET`. User changed it to allow `PUT` with header `content-type` from the production origin.
- Pass (after the CORS fix): image upload goes straight to R2; gallery and drawer show the image; Download button present.
- Pass: image file route answers 200 `image/png`, `inline`, `Cache-Control: private, no-cache`, an `ETag` (a hash, not the key), sandbox CSP, `nosniff`; `If-None-Match` answers 304; `?download=1` answers `attachment`.
- Pass: deleting the image removes the item; its file route answers 404 afterwards.
- Pass: deleting an image item whose object never reached R2 still succeeds ("Item deleted").
- Pass: a failed upload shows "The item was saved, but its file didn't upload. Delete it and try again." and the gallery shows the placeholder.
- **Gap:** a Pro user's Settings has no billing section: no plan, renewal date, manage or cancel. Deleting the account is the only way to end the subscription. The adapter already has `createPortalLink`; wire a "Manage subscription" card (overlaps the deferred Settings billing return).
- Minor, unconfirmed: clicking "$72 / year" in the Pro dialog wrote to the OS clipboard. The only writers are the Copy buttons; the New Item dialog's code editor Copy button sat behind the Pro dialog, so the click likely reached it too.

**GitHub and passwords (2026-10-26)**

- Pass: Sign in with GitHub (user clicked) lands on `/dashboard` with name and avatar; empty account.
- Pass: Settings hides Change password for the GitHub-only account; Delete account shown.
- Pass: wrong password on test1 shows "Invalid email or password" (user-reported).
- Pass: change password keeps this device signed in; `sessionVersion` in the session went 0 → 2 (one bump per change, so two changes went through; confirm with the user). Signing out other sessions not checked (no second session).

**Cleanup (2026-10-26)**

- Done: test1, test2 and test3 deleted from Settings → Delete account ("Account deleted" toast, session cleared). Items, collections and tags went with them; test2's broken `E2E file` row (no object in R2) went with the account. The one stored image was deleted from its drawer beforehand, so no R2 object is left (account deletion doesn't clear R2; README Future Plans).
- Done: test1 sign-in after deletion fails with "Invalid email or password" (user-reported).
- Done: deleting test2 cancelled its subscription first; Stripe sandbox shows it Canceled and nothing open (user-checked).
- Kept: the user's GitHub-linked account, at the user's choice.
- Done: browser pane signed out.

**Summary**

- Fixed during the run (production config, no code): Stripe env vars and webhook destination; R2 CORS rule for `PUT` + `content-type`.
- Follow-ups: billing section in Settings (portal link, plan, cancel); Stripe public business name; stale publishable-key line in `project-overview.md`; drawer double fetch; the clipboard write.
- Not run: 50-item limit; other-session revocation after a password change; the taken-email register check (accounts were registered before the run).

### Notes

- Production, not the dev branch: no Neon MCP use against `production` and no SQL; everything goes through the app UI (CLAUDE.md "Production and data").
- Test accounts (created by the user; password never written down here):
  - `test1@test.com`: Free (item and collection CRUD, gating, limits).
  - `test2@test.com`: upgraded to Pro (Stripe, uploads).
  - `test3@test.com`: cross-account check, then delete account.
  - The user's GitHub account: OAuth sign-in.
- Account creation and password entry on the production host have to be done by the user in the browser pane; Claude drives the rest once signed in. Same for GitHub OAuth consent and entering the Stripe test card on Checkout.
- Stripe is in sandbox mode, so only test cards apply; the webhook must reach `/api/billing/stripe/webhook` on the production URL for the period to settle.
- Out of scope: fixing bugs found here (each becomes its own feature), load testing, the deferred `/items` link and Settings billing return.
