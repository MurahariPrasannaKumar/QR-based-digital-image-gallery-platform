# QR Gallery

Create a photo gallery, upload JPG/PNG images, and get a shareable QR code and link.
Visitors scan the code and view or download the photos instantly — no account required.

Designed to run for **$0/month** as an MVP: [Vercel](https://vercel.com) (hosting) +
[Neon](https://neon.tech) (Postgres, gallery/image metadata) +
[Supabase Storage](https://supabase.com/storage) (image files) +
[Firebase Authentication](https://firebase.google.com/products/auth) (accounts) all have free
tiers generous enough for a small app.

## Features

**Creators**
- Register / log in via Firebase Authentication (email + password)
- Email verification and password reset, sent by Firebase itself — no SMTP to configure
- Create galleries with a name, description, and visibility (public or password-protected)
- Drag-and-drop image uploader — files go **directly from the browser to Supabase Storage**
  via presigned URLs, with client + server validation and upload progress
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
- [Prisma](https://www.prisma.io) + PostgreSQL (via `@prisma/adapter-pg`) — gallery/image metadata only
- [Supabase Storage](https://supabase.com/storage) (S3-compatible) via `@aws-sdk/client-s3` / `@aws-sdk/s3-request-presigner` — image binary storage
- [Firebase Authentication](https://firebase.google.com/products/auth) — accounts, sessions, email verification, password reset (client SDK + Admin SDK)
- [Zod](https://zod.dev) + [React Hook Form](https://react-hook-form.com)
- [qrcode](https://www.npmjs.com/package/qrcode) for QR generation
- [archiver](https://www.npmjs.com/package/archiver) for streamed ZIP downloads
- [@dnd-kit](https://dndkit.com) for drag-and-drop image reordering
- [Framer Motion](https://www.framer.com/motion/) for the lightbox transition

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
   └──────────────► Supabase Storage         (actual JPG/PNG binaries)
```

**PostgreSQL stores metadata only.** The `Image` table has no binary column — instead a
`storageKey` string points at the object in Supabase Storage (e.g.
`galleries/{galleryId}/{uuid}.jpg`). Metadata queries never touch image bytes, so listing a
50-image gallery is a handful of KB, not tens of MB.

**Uploads go straight from the browser to Supabase Storage.** The Next.js server never sees
the file bytes:

```
Browser → POST /api/galleries/[id]/images/presign  (auth + ownership + limits checked)
        ← presigned PUT URL(s)
Browser → PUT directly to Supabase Storage           (bytes never touch the server)
Browser → POST /api/galleries/[id]/images/confirm    (re-validated, writes DB metadata)
```

This keeps upload requests off Vercel Function bodies/duration entirely and avoids Vercel's
request size limits for large batches of images.

**Downloads and viewing redirect, they don't proxy.** `GET /api/images/[id]` and
`GET /api/images/[id]/download` do the authorization check, then `302` to either the bucket's
public URL (public galleries, if `SUPABASE_PUBLIC_URL` is configured) or a short-lived
presigned URL (private/password-protected galleries, and always for forced downloads — the
presigned URL carries a `Content-Disposition` override so the original filename survives
without the bytes passing through a function). `GET /api/galleries/[slug]/download-all`
streams a ZIP by piping each object directly into the archive, so a 100 MB gallery is never
fully buffered in memory.

**Image storage is behind an abstraction** (`src/lib/storage/image-storage.ts`), currently
implemented by `supabase-image-storage.ts`. Nothing in the UI or gallery logic talks to
Supabase Storage directly — everything goes through `ImageStorage` (`createUploadTarget()` /
`confirmUpload()` / `getViewUrl()` / `getDownloadUrl()` / `getObjectStream()` / `deleteImage()`
/ `deleteGalleryObjects()` / `getGalleryImages()`). Swapping in S3, R2, Cloudinary, or another
provider later means writing one new class against that interface — no route or component
changes.

**Authentication uses Firebase Authentication**, not a Postgres-backed Credentials flow.
Sign-in/sign-up/password-reset/email-verification happen directly between the browser and
Firebase via the client SDK (`src/lib/firebase/client.ts`) — the Next.js server never sees a
password. After Firebase signs a user in, the browser exchanges a freshly-issued ID token for
an httpOnly session cookie (`POST /api/auth/session`, backed by the Admin SDK's
`createSessionCookie`) that the server verifies on every request (`src/lib/session.ts`,
`getCurrentUser()`/`requireUser()`). Postgres holds no user table at all — `Gallery.userId`
is just the Firebase UID string, with no foreign key. `/dashboard/*` is protected at the
layout level (`requireUser()` redirects to `/login`), not via edge middleware, since the
Admin SDK's Node.js dependencies aren't Edge-runtime-safe.

**Authorization** is re-checked on every mutating request — `src/lib/authorize.ts` loads a
gallery or image only if it belongs to the authenticated user, and every API route uses it
before touching data. Gallery/image ids from the client are never trusted on their own. This
includes the upload flow: a presigned URL can only be requested for a gallery you own, and
`confirm` re-validates that the storage key you're attaching actually belongs to that gallery
(a client can't attach an object it didn't just get a presigned URL for).

**Password-protected galleries** use a short-lived, HMAC-signed cookie
(`src/lib/gallery-access.ts`) scoped to a single gallery, set only after the password is
verified server-side with bcrypt. The password hash is never sent to the client.

**Email verification & password reset are entirely Firebase's.** `sendEmailVerification()` /
`sendPasswordResetEmail()` (client SDK) trigger Firebase's own email delivery — no SMTP
provider to configure. The emailed links point back into this app (`/verify-email` and
`/reset-password`, each reading Firebase's `oobCode` query param and calling
`applyActionCode()` / `confirmPasswordReset()`) rather than Firebase's generic hosted pages —
this requires setting a custom **Action URL** in the Firebase Console (see
[Firebase Authentication Setup](#firebase-authentication-setup)). `sendPasswordResetEmail()`
throwing `auth/user-not-found` is still reported to the UI as success, to avoid leaking which
emails are registered.

**Rate limiting** (`src/lib/rate-limit.ts`) is an in-memory fixed-window limiter applied to
the upload `presign`/`confirm` endpoints. Registration/login/password-reset/email-verification
no longer go through this app's API at all (they're direct Firebase SDK calls), so they're
governed by Firebase's own quotas/abuse protection instead. It's per-serverless-instance, not
distributed — see [Limitations](#limitations).

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Where | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | server-only | Postgres connection string (Neon in production) — gallery/image metadata only, no user data |
| `AUTH_SECRET` | server-only | Signs the gallery-password access cookie only (unrelated to user auth, which is Firebase's) |
| `FIREBASE_PROJECT_ID` | server-only | From your Firebase service account JSON |
| `FIREBASE_CLIENT_EMAIL` | server-only | From your Firebase service account JSON — an auto-generated `...@<project>.iam.gserviceaccount.com` address, not a personal email |
| `FIREBASE_PRIVATE_KEY` | server-only | From your Firebase service account JSON, pasted as-is (including `\n` sequences) |
| `SUPABASE_S3_ENDPOINT` | server-only | The Supabase Storage S3-compatible endpoint (from Project Settings → Storage → S3 Connection). For local dev, point this at MinIO instead |
| `SUPABASE_S3_REGION` | server-only | Region shown alongside the S3 endpoint in the Supabase dashboard |
| `SUPABASE_S3_ACCESS_KEY_ID` / `SUPABASE_S3_SECRET_ACCESS_KEY` | server-only | S3 access key credentials created in Storage → S3 Connection (separate from your Supabase API keys) |
| `SUPABASE_STORAGE_BUCKET` | server-only | The bucket images are stored in |
| `SUPABASE_PUBLIC_URL` | server-only | Optional public bucket URL base — fast path for viewing images in **public** galleries only (only works if the bucket is set to Public) |
| `NEXT_PUBLIC_APP_URL` | **client-safe** | Embedded in QR codes — must be your real production domain |
| `NEXT_PUBLIC_FIREBASE_API_KEY` / `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` / `NEXT_PUBLIC_FIREBASE_PROJECT_ID` / `NEXT_PUBLIC_FIREBASE_APP_ID` / `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | **client-safe** | Firebase web app config (Project Settings → General → Your apps) — safe to expose, Firebase enforces access via its own rules |

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
SUPABASE_S3_ENDPOINT="http://localhost:9000"
SUPABASE_S3_REGION="us-east-1"
SUPABASE_S3_ACCESS_KEY_ID="minioadmin"
SUPABASE_S3_SECRET_ACCESS_KEY="minioadmin123"
SUPABASE_STORAGE_BUCKET="qr-gallery-images"
SUPABASE_PUBLIC_URL="http://localhost:9000/qr-gallery-images"
```

MinIO speaks the same S3 API Supabase Storage does, so everything — presigned uploads, signed
downloads, the ZIP streaming — works identically to production, just pointed at a local
container.

> If port `5432` is already taken by another local Postgres install, map to a free port
> instead (e.g. `-p 5433:5432`) and update `DATABASE_URL` accordingly.

**Option B — Neon + real Supabase Storage, no Docker at all**

Just point `DATABASE_URL` at a free Neon database and the `SUPABASE_S3_*` variables at a real
Supabase Storage bucket (see [Supabase Storage Setup](#supabase-storage-setup) below). This is
the closest local setup to production and doesn't require Docker at all — a good option if
you'd rather not run local containers.

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
| POST | `/api/auth/session` | Exchange a Firebase ID token for an httpOnly session cookie (also used by login/register) |
| DELETE | `/api/auth/session` | Clear the session cookie (sign out) |
| GET/POST | `/api/galleries` | List / create galleries (owner only) |
| GET/PATCH/DELETE | `/api/galleries/[id]` | Read / update / delete a gallery (owner only); delete also purges its storage objects |
| POST | `/api/galleries/[id]/images/presign` | Authorize an upload batch, return presigned PUT URLs (owner only) — rate-limited |
| POST | `/api/galleries/[id]/images/confirm` | Finalize uploads after the browser has PUT them to Supabase Storage (owner only) — rate-limited |
| PATCH | `/api/galleries/[id]/images/reorder` | Persist new image order (owner only) |
| GET | `/api/galleries/[id]/qr` | Download the gallery QR as PNG or SVG (owner only) |
| POST | `/api/galleries/[id]/verify-password` | Verify a public gallery's password (`id` here is the gallery's slug) |
| GET | `/api/galleries/[id]/download-all` | Stream all images as a ZIP (`id` here is the gallery's slug) |
| GET | `/api/images/[id]` | Redirect to a viewable URL for the image (authorization-checked) |
| GET | `/api/images/[id]/download` | Redirect to a presigned download URL with the original filename |
| DELETE | `/api/images/[id]` | Delete an image — removes the storage object then the DB row (owner only) |

## Limits

Configured in `src/lib/constants.ts` and enforced both client- and server-side (including at
upload-confirm time, since gallery state can change between presign and confirm):

- Allowed formats: JPG, JPEG, PNG
- Max file size: 5 MB per image
- Max images per gallery: 50
- Max total gallery size: 100 MB

## Supabase Storage Setup

1. Sign up / log in at [supabase.com](https://supabase.com) and **create a project** — the
   free plan covers this app.
2. **Storage → Create bucket.** Name it (e.g. `qr-gallery-images`). Leave it **Private**
   unless you want the optional public-URL fast path (step 5).
3. **Project Settings → Storage → S3 Connection.** Click "Connect" and switch to the **S3**
   tab — this gives you the S3-compatible **Endpoint** and **Region** for this project.
4. On the same screen, **create an S3 access key** (this is separate from your Supabase API
   keys) — it gives you an **Access Key ID** and **Secret Access Key**, copy both immediately
   (the secret is shown once).
5. **Optional — public viewing for public galleries.** If you want fast, unsigned viewing for
   *public* galleries, set the bucket to **Public** (Storage → your bucket → Settings) and use
   `https://<project-ref>.supabase.co/storage/v1/object/public/<bucket-name>` as
   `SUPABASE_PUBLIC_URL`. Private/password-protected galleries never use this — they always
   get a short-lived signed URL regardless. If you skip this, everything still works — public
   galleries just also use signed URLs instead of the public path.
6. **CORS — usually not required.** Supabase Storage's S3-compatible endpoint allows
   cross-origin requests by default; if you hit a CORS error on upload, check Storage
   settings in the dashboard for a CORS/allowed-origins option and add your production domain
   plus `http://localhost:3000`.
7. Fill in `.env` (or Vercel's environment variables):
   ```bash
   SUPABASE_S3_ENDPOINT="<endpoint from step 3>"
   SUPABASE_S3_REGION="<region from step 3>"
   SUPABASE_S3_ACCESS_KEY_ID="<the access key id from step 4>"
   SUPABASE_S3_SECRET_ACCESS_KEY="<the secret access key from step 4>"
   SUPABASE_STORAGE_BUCKET="qr-gallery-images"
   SUPABASE_PUBLIC_URL="https://<project-ref>.supabase.co/storage/v1/object/public/qr-gallery-images"   # optional, see step 5
   ```

Free tier (subject to change — check Supabase's current terms): **1 GB storage**, 2 GB
egress/month, plenty for a low-volume gallery app that isn't doing bulk uploads. Unlike a
usage-based billing plan, exceeding the free tier on a free project simply blocks new
uploads/requests rather than generating a bill.

## Firebase Authentication Setup

1. Sign up / log in at [console.firebase.google.com](https://console.firebase.google.com) and
   **create a project** — the free Spark plan covers this app.
2. **Authentication → Get started → Sign-in method → Email/Password.** Enable it.
3. **Project Settings → General → Your apps → Add app → Web.** Register a web app (no
   Firebase Hosting needed). Copy the config values it shows you
   (`apiKey`/`authDomain`/`projectId`/`appId`/`messagingSenderId`) into the
   `NEXT_PUBLIC_FIREBASE_*` variables.
4. **Project Settings → Service Accounts → Generate new private key.** Downloads a JSON file —
   copy its `project_id` → `FIREBASE_PROJECT_ID`, `client_email` → `FIREBASE_CLIENT_EMAIL`,
   and `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` sequences literal, in quotes).
   **This is a different set of credentials from step 3** — the web app config is client-safe,
   this service account is a server-only secret. Never commit that JSON file.
5. **Authentication → Templates → set a custom Action URL — required.** By default, the
   verification/password-reset links Firebase emails point at a generic Firebase-hosted page,
   not this app's own `/verify-email` and `/reset-password` pages. Open each template (Email
   address verification, Password reset), click the pencil/customize icon, and set the action
   URL to your domain (e.g. `https://your-app.vercel.app` for production,
   `http://localhost:3000` while testing locally — you'll need to switch it back and forth, or
   just set it to production and test verification/reset flows against the deployed site).
6. Fill in `.env` (or Vercel's environment variables) with the values from steps 3 and 4.

Free tier (Spark plan, subject to change): 50,000 monthly active users' worth of
Email/Password auth, which is far beyond what a small gallery app needs — this tier doesn't
expire and isn't usage-billed.

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
   from `.env.example` with real values (`DATABASE_URL` from Neon, the `SUPABASE_S3_*` /
   `SUPABASE_STORAGE_BUCKET` values from Supabase, the `FIREBASE_*` and
   `NEXT_PUBLIC_FIREBASE_*` values from Firebase, a freshly generated `AUTH_SECRET`, and
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
7. **Verify the Firebase Action URL** — make sure step 5 of
   [Firebase Authentication Setup](#firebase-authentication-setup) points at your real
   deployed domain, or verification/reset emails will link to a generic Firebase page instead
   of this app's UI.
8. **Verify Supabase Storage** — upload an image to a test gallery and confirm it appears
   (check the bucket in the Supabase dashboard for the new object under `galleries/<id>/`).
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
  mid-upload) leave an orphaned object in Supabase Storage — there's no background
  reconciliation job. Given Supabase's free tier (1 GB) this is a non-issue at MVP scale; a
  scheduled cleanup job (delete objects under `galleries/*` older than 24h with no matching
  `Image.storageKey`) would be the fix if it ever matters.
- No automated test suite yet — verification for this app has been manual/scripted end-to-end
  testing (see the Vercel Deployment section above) rather than a CI test suite.

## Future Improvements

- Add a scheduled job (Vercel Cron, on the free tier) to reconcile orphaned Supabase Storage
  objects from abandoned uploads.
- Swap the in-memory rate limiter for Upstash Redis if traffic grows enough that per-instance
  limiting becomes a real gap.
- Gate dashboard/gallery-creation access behind a verified email.
- Automated test suite (the manual E2E coverage this app has been verified against would
  translate directly into integration tests).
