# QR Gallery

Create a photo gallery, upload JPG/PNG images, and get a shareable QR code and link.
Visitors scan the code and view or download the photos instantly — no account required.

Designed to run for **$0/month** as an MVP: [Vercel](https://vercel.com) (hosting) +
[Neon](https://neon.tech) (Postgres) + [Cloudflare R2](https://developers.cloudflare.com/r2/)
(image storage) all have free tiers generous enough for a small app.

## Features

**Creators**
- Register / log in with a secure, hashed password (bcrypt)
- Email verification and password reset, delivered over SMTP (nodemailer)
- Create galleries with a name, description, and visibility (public or password-protected)
- Drag-and-drop image uploader — files go **directly from the browser to R2** via presigned
  URLs, with client + server validation and upload progress
- Manage a gallery: rename, edit description, add/remove images, reorder via drag-and-drop,
  change visibility, set or change a password, delete the gallery
- Unique, collision-resistant gallery slug and public URL generated automatically
- High-resolution QR code, downloadable as PNG or SVG
- Dashboard with stats, search, empty states, and loading skeletons

**Visitors**
- No account needed — scan the QR code or open the link
- Responsive, mobile-first gallery grid (2 columns on mobile, 3 on tablet, 4 on desktop)
- Fullscreen lightbox with keyboard navigation (Esc / ← / →) and touch swipe
- Download any single image, or download the whole gallery as a streamed ZIP
- Password gate for protected galleries
- Native share sheet (Web Share API) with clipboard fallback

## Tech Stack

- [Next.js](https://nextjs.org) (App Router, Turbopack) + TypeScript + React
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (built on [Base UI](https://base-ui.com)) + [Lucide](https://lucide.dev) icons
- [Prisma](https://www.prisma.io) + PostgreSQL (via `@prisma/adapter-pg`) — metadata only
- [Cloudflare R2](https://developers.cloudflare.com/r2/) via `@aws-sdk/client-s3` / `@aws-sdk/s3-request-presigner` — image binary storage
- [Auth.js (NextAuth v5)](https://authjs.dev) with a Credentials provider
- [Zod](https://zod.dev) + [React Hook Form](https://react-hook-form.com)
- [qrcode](https://www.npmjs.com/package/qrcode) for QR generation
- [archiver](https://www.npmjs.com/package/archiver) for streamed ZIP downloads
- [@dnd-kit](https://dndkit.com) for drag-and-drop image reordering
- [Framer Motion](https://www.framer.com/motion/) for the lightbox transition
- [Nodemailer](https://nodemailer.com) for SMTP email (verification + password reset)

## Architecture

```
Browser
   │
   ▼
Vercel / Next.js (App Router)
   ├── Server Components  → read gallery/image metadata via Prisma
   ├── API Route Handlers → auth, mutations, presigned URLs (Zod-validated, ownership-checked)
   │
   ├──────────────► Neon PostgreSQL          (users, galleries, image metadata, tokens)
   │
   └──────────────► Cloudflare R2            (actual JPG/PNG binaries)
```

**PostgreSQL stores metadata only.** The `Image` table has no binary column — instead a
`storageKey` string points at the object in R2 (e.g. `galleries/{galleryId}/{uuid}.jpg`).
Metadata queries never touch image bytes, so listing a 50-image gallery is a handful of KB,
not tens of MB.

**Uploads go straight from the browser to R2.** The Next.js server never sees the file bytes:

```
Browser → POST /api/galleries/[id]/images/presign  (auth + ownership + limits checked)
        ← presigned PUT URL(s)
Browser → PUT directly to R2                        (bytes never touch the server)
Browser → POST /api/galleries/[id]/images/confirm    (re-validated, writes DB metadata)
```

This keeps upload requests off Vercel Function bodies/duration entirely and avoids Vercel's
request size limits for large batches of images.

**Downloads and viewing redirect, they don't proxy.** `GET /api/images/[id]` and
`GET /api/images/[id]/download` do the authorization check, then `302` to either R2's public
URL (public galleries, if `R2_PUBLIC_URL` is configured) or a short-lived presigned URL
(private/password-protected galleries, and always for forced downloads — the presigned URL
carries a `Content-Disposition` override so the original filename survives without the bytes
passing through a function). `GET /api/galleries/[slug]/download-all` streams a ZIP by piping
each R2 object directly into the archive, so a 100 MB gallery is never fully buffered in memory.

**Image storage is behind an abstraction** (`src/lib/storage/image-storage.ts`), currently
implemented by `r2-image-storage.ts`. Nothing in the UI or gallery logic talks to R2 directly
— everything goes through `ImageStorage` (`createUploadTarget()` / `confirmUpload()` /
`getViewUrl()` / `getDownloadUrl()` / `getObjectStream()` / `deleteImage()` /
`deleteGalleryObjects()` / `getGalleryImages()`). Swapping in S3, Cloudinary, or another
provider later means writing one new class against that interface — no route or component
changes.

**Authentication** uses Auth.js with a Credentials provider and JWT sessions (no separate
session table). Passwords are hashed with bcrypt (12 rounds). Because Prisma's Node-only
driver adapter can't run in the Edge runtime, the app splits the NextAuth config into
`src/auth.config.ts` (Edge-safe, used by `src/proxy.ts` to protect `/dashboard/*`) and
`src/auth.ts` (full config with the Credentials provider, used by API routes and Server
Components). Every route that touches Prisma, R2, or Nodemailer runs on the Node.js runtime
(the Next.js default) — none of them declare `export const runtime = "edge"`.

**Authorization** is re-checked on every mutating request — `src/lib/authorize.ts` loads a
gallery or image only if it belongs to the authenticated user, and every API route uses it
before touching data. Gallery/image ids from the client are never trusted on their own. This
includes the upload flow: a presigned URL can only be requested for a gallery you own, and
`confirm` re-validates that the storage key you're attaching actually belongs to that gallery
(a client can't attach an object it didn't just get a presigned URL for).

**Password-protected galleries** use a short-lived, HMAC-signed cookie
(`src/lib/gallery-access.ts`) scoped to a single gallery, set only after the password is
verified server-side with bcrypt. The password hash is never sent to the client.

**Email verification & password reset** use single-use, expiring tokens stored in the
`VerificationToken` table (`src/lib/verification-tokens.ts`) — 24h for email verification,
1h for password reset. Requesting a new token invalidates any outstanding one of the same
type, and consuming a token deletes it, so links can't be replayed. The forgot-password
endpoint always returns the same response whether or not the email is registered, to avoid
leaking which addresses have accounts.

**Rate limiting** (`src/lib/rate-limit.ts`) is an in-memory fixed-window limiter applied to
`/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/reset-password`,
`/api/auth/verify-email/resend`, and the upload `presign`/`confirm` endpoints. It's
per-serverless-instance, not distributed — see [Limitations](#limitations).

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | server-only | Postgres connection string (Neon in production) |
| `AUTH_SECRET` | server-only | Signs sessions and the gallery-password cookie |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | server-only | Outbound email. Optional in dev (falls back to Ethereal) |
| `R2_ACCOUNT_ID` | server-only | Cloudflare account id — derives the R2 endpoint in production |
| `R2_ENDPOINT` | server-only | Overrides the endpoint for local dev (e.g. MinIO) — leave blank in production |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | server-only | R2 API token credentials |
| `R2_BUCKET_NAME` | server-only | The bucket images are stored in |
| `R2_PUBLIC_URL` | server-only | Optional public bucket domain — fast path for viewing images in **public** galleries only |
| `NEXT_PUBLIC_APP_URL` | **client-safe** | Embedded in QR codes and email links — must be your real production domain |

Never prefix any of the server-only variables with `NEXT_PUBLIC_` — that would bundle them
into client-side JavaScript.

Generate a secure `AUTH_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Local Development

You need Postgres and an S3-compatible object store. Two ways to get both for free:

**Option A — Docker (fastest to start)**

```bash
docker run -d --name qr-gallery-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=qr_gallery -p 5432:5432 postgres:16-alpine

docker run -d --name qr-gallery-minio -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin123 -p 9000:9000 -p 9001:9001 \
  minio/minio server /data --console-address ":9001"

# create the bucket (one-time)
docker run --rm --network host --entrypoint sh minio/mc -c "
  mc alias set local http://localhost:9000 minioadmin minioadmin123 &&
  mc mb local/qr-gallery-images --ignore-existing &&
  mc anonymous set public local/qr-gallery-images"
```

Then in `.env`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qr_gallery?schema=public"
R2_ENDPOINT="http://localhost:9000"
R2_ACCESS_KEY_ID="minioadmin"
R2_SECRET_ACCESS_KEY="minioadmin123"
R2_BUCKET_NAME="qr-gallery-images"
R2_PUBLIC_URL="http://localhost:9000/qr-gallery-images"
```

MinIO speaks the same S3 API R2 does, so everything — presigned uploads, signed downloads,
the ZIP streaming — works identically to production, just pointed at a local container. This
is genuinely how the upload/download/delete flow in this app was verified.

> If port `5432` is already taken by another local Postgres install, map to a free port
> instead (e.g. `-p 5433:5432`) and update `DATABASE_URL` accordingly.

**Option B — Neon + real R2, no Docker at all**

Just point `DATABASE_URL` at a free Neon database and the `R2_*` variables at a real
Cloudflare R2 bucket (see [R2 Setup](#cloudflare-r2-setup) below, and leave `R2_ENDPOINT`
blank so it's derived from `R2_ACCOUNT_ID`). This is the closest local setup to production
and doesn't require Docker at all — a good option if you'd rather not run local containers.

**Then, either way:**

```bash
npm install
npm run db:generate   # generate the Prisma client
npm run db:migrate    # create/apply migrations against your database
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

```bash
npm run build
npm run start
```

On Vercel, `npm run build` is run automatically; run `npm run db:deploy` (`prisma migrate
deploy`) separately against your production database before or right after the first deploy
— see [Vercel Deployment](#vercel-deployment) below.

## API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account (also sends a verification email) — rate-limited |
| * | `/api/auth/[...nextauth]` | Auth.js sign-in/sign-out/session handlers |
| POST | `/api/auth/verify-email/resend` | Resend the verification email (authenticated) — rate-limited |
| POST | `/api/auth/forgot-password` | Request a password-reset email — rate-limited |
| POST | `/api/auth/reset-password` | Consume a reset token and set a new password — rate-limited |
| GET/POST | `/api/galleries` | List / create galleries (owner only) |
| GET/PATCH/DELETE | `/api/galleries/[id]` | Read / update / delete a gallery (owner only); delete also purges its R2 objects |
| POST | `/api/galleries/[id]/images/presign` | Authorize an upload batch, return presigned PUT URLs (owner only) — rate-limited |
| POST | `/api/galleries/[id]/images/confirm` | Finalize uploads after the browser has PUT them to R2 (owner only) — rate-limited |
| PATCH | `/api/galleries/[id]/images/reorder` | Persist new image order (owner only) |
| GET | `/api/galleries/[id]/qr` | Download the gallery QR as PNG or SVG (owner only) |
| POST | `/api/galleries/[id]/verify-password` | Verify a public gallery's password (`id` here is the gallery's slug) |
| GET | `/api/galleries/[id]/download-all` | Stream all images as a ZIP (`id` here is the gallery's slug) |
| GET | `/api/images/[id]` | Redirect to a viewable URL for the image (authorization-checked) |
| GET | `/api/images/[id]/download` | Redirect to a presigned download URL with the original filename |
| DELETE | `/api/images/[id]` | Delete an image — removes the R2 object then the DB row (owner only) |

## Limits

Configured in `src/lib/constants.ts` and enforced both client- and server-side (including at
upload-confirm time, since gallery state can change between presign and confirm):

- Allowed formats: JPG, JPEG, PNG
- Max file size: 5 MB per image
- Max images per gallery: 50
- Max total gallery size: 100 MB

## Cloudflare R2 Setup

1. Sign up / log in at [dash.cloudflare.com](https://dash.cloudflare.com) — R2 is available
   on the free plan.
2. **R2 → Create bucket.** Name it (e.g. `qr-gallery-images`), leave default settings.
3. **R2 → your bucket → Settings → Public Access** — optional. If you want fast, unsigned
   viewing for *public* galleries, enable a public bucket domain (either the free `r2.dev`
   subdomain, or a custom domain you own) and put it in `R2_PUBLIC_URL`. Private/
   password-protected galleries never use this — they always get a short-lived signed URL
   regardless. If you skip this, everything still works — public galleries just also use
   signed URLs instead of the public path.
4. **R2 → Manage API tokens → Create API token.** Choose "Object Read & Write", scope it to
   your bucket. This gives you an **Access Key ID** and **Secret Access Key** — copy both
   immediately (the secret is shown once).
5. Your **Account ID** is shown on the R2 overview page (or any zone's overview page) in the
   right sidebar.
6. Fill in `.env` (or Vercel's environment variables):
   ```bash
   R2_ACCOUNT_ID="<your account id>"
   R2_ACCESS_KEY_ID="<the access key id from step 4>"
   R2_SECRET_ACCESS_KEY="<the secret access key from step 4>"
   R2_BUCKET_NAME="qr-gallery-images"
   R2_PUBLIC_URL="https://<your r2.dev or custom domain>"   # optional, see step 3
   ```
   Leave `R2_ENDPOINT` blank in production — it's derived from `R2_ACCOUNT_ID`.

Free tier (subject to change — check Cloudflare's current terms): ~10 GB-month storage, 1M
Class A ops/month, 10M Class B ops/month, and R2 has **no egress fees**, which is what makes
serving images this way free regardless of how much a gallery gets viewed.

## Neon Setup

1. Sign up / log in at [neon.tech](https://neon.tech) — the free plan covers this app.
2. **Create a project.** Pick a region close to where you'll deploy on Vercel.
3. Neon gives you a connection string immediately — copy the **pooled** connection string
   (Neon's dashboard labels it, usually ending in `-pooler` in the hostname) for
   `DATABASE_URL`; serverless/edge-adjacent platforms like Vercel benefit from Neon's
   connection pooler since each function invocation opens a fresh connection.
4. Set `DATABASE_URL` in `.env` (locally) or Vercel's environment variables (production) to
   that string — it already includes `?sslmode=require`, which Neon requires.
5. Run migrations against it: `npm run db:deploy` (or `npm run db:migrate` the first time
   from your machine, then `db:deploy` for subsequent deploys).

Free tier (subject to change): ~0.5 GB storage, generous but limited monthly compute hours,
and the database auto-suspends when idle (a cold start adds latency to the first request
after idle, which is normal and fine for an MVP).

## Vercel Deployment

1. **Push this repository to GitHub** (if you haven't already).
2. **Import the project into Vercel** — [vercel.com/new](https://vercel.com/new), select the
   repo. Vercel auto-detects Next.js; no build command changes are needed
   (`next build` is correct as-is).
3. **Configure environment variables** in the Vercel project settings — add every variable
   from `.env.example` with real values (`DATABASE_URL` from Neon, the `R2_*` values from
   Cloudflare, `SMTP_*` from your mail provider, a freshly generated `AUTH_SECRET`, and
   `NEXT_PUBLIC_APP_URL` set to your **real production domain**, e.g.
   `https://your-app.vercel.app` or your custom domain — not `localhost`).
4. **Deploy.** The build command doesn't need changes; if you want migrations to run as part
   of the build you can set the build command to
   `npm run db:deploy && npm run build` — otherwise run migrations manually (next step).
5. **Configure your production domain** (optional) — Vercel project settings → Domains, if
   you're using a custom domain instead of the default `*.vercel.app` one. Update
   `NEXT_PUBLIC_APP_URL` to match if you do.
6. **Run database migrations** against production, if you didn't fold it into the build
   command: `npm run db:deploy` from your machine with `DATABASE_URL` pointed at Neon (or via
   `vercel env pull` to get the production value locally first).
7. **Verify SMTP** — register a test account on the deployed site and confirm the
   verification email actually arrives (not just an Ethereal preview link — with real
   `SMTP_*` vars set, `src/lib/mailer.ts` sends for real).
8. **Verify R2** — upload an image to a test gallery and confirm it appears (check the R2
   bucket in the Cloudflare dashboard for the new object under `galleries/<id>/`).
9. **Test authentication** — register, verify email, log out, log back in, forgot password →
   reset → log in with the new password.
10. **Test gallery creation** — create a public gallery and a password-protected one.
11. **Test upload** — multiple images, confirm the progress bar and that they appear in the
    gallery grid afterward.
12. **Test the QR code** — download the PNG from a gallery's QR page and scan it with a phone;
    confirm it opens `https://<your-real-domain>/g/<slug>`, not `localhost`.
13. **Test the public gallery** — open the scanned link in a private/incognito window (no
    session) and confirm images load, the lightbox works, and password gates work if set.
14. **Test download** — download a single image and "Download All" as a ZIP; confirm the ZIP
    opens and filenames are preserved.

## Migrating Existing BYTEA Images to R2

If you're upgrading an existing deployment that stored images as PostgreSQL `BYTEA` (an
earlier version of this app did), don't just drop that column — you'll silently lose every
photo already uploaded. The migration is two steps:

1. **Expand**: add a nullable `storageKey` column alongside the existing `data` column
   (already the shape of `prisma/migrations/..._expand_add_storage_key`).
2. **Backfill**: run `npm run migrate:bytea-to-r2` — reads every `Image` row with `data` but
   no `storageKey`, uploads the bytes to R2, and sets `storageKey` (only clearing `data` after
   a successful upload, so a failure partway through leaves affected rows retriable and
   nothing is lost). Safe to re-run.
3. **Contract**: once the script reports all rows migrated, apply the migration that drops
   `data` and makes `storageKey` required (`prisma/migrations/..._contract_drop_bytea`).

This repository already went through that migration for its own local dev data as part of
building the R2 support — `scripts/migrate-bytea-to-r2.mjs` is the exact script used, not a
placeholder.

## Limitations

- **Rate limiting is per-instance, not distributed.** `src/lib/rate-limit.ts` is an in-memory
  fixed-window limiter — correct on a single long-lived server, but on Vercel each warm
  serverless instance has its own counter, so the effective limit under heavy concurrent
  traffic from one attacker is closer to `limit × (warm instance count)` than a hard global
  cap. This still stops casual scripted abuse without a paid Redis dependency, which is the
  right tradeoff for a $0/month MVP — if this becomes a real problem, swap in Upstash Redis
  (has a free tier) behind the same `rateLimit()` call site; nothing else needs to change.
- Verified users can still sign in and use the app before verifying their email; verification
  is currently informational (shown in Settings), not gate-kept.
- The gallery-password session is a single HMAC-signed cookie per gallery (24h) rather than a
  server-side session table — sufficient for casual protection, not bank-grade.
- Presigned upload URLs that are requested but never confirmed (e.g. the user closes the tab
  mid-upload) leave an orphaned object in R2 — there's no background reconciliation job. Given
  R2's free tier (10 GB-month) this is a non-issue at MVP scale; a scheduled cleanup job
  (delete objects under `galleries/*` older than 24h with no matching `Image.storageKey`)
  would be the fix if it ever matters.
- No automated test suite yet — verification for this app has been manual/scripted end-to-end
  testing (see the R2 section above) rather than a CI test suite.

## Future Improvements

- Add a scheduled job (Vercel Cron, on the free tier) to reconcile orphaned R2 objects from
  abandoned uploads.
- Swap the in-memory rate limiter for Upstash Redis if traffic grows enough that per-instance
  limiting becomes a real gap.
- Gate dashboard/gallery-creation access behind a verified email.
- Automated test suite (the manual E2E coverage this app has been verified against would
  translate directly into integration tests).
