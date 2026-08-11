# QR Gallery

Create a photo gallery, upload JPG/PNG images, and get a shareable QR code and link.
Visitors scan the code and view or download the photos instantly — no account required.

## Features

**Creators**
- Register / log in with a secure, hashed password (bcrypt)
- Email verification and password reset, delivered over SMTP (nodemailer)
- Create galleries with a name, description, and visibility (public or password-protected)
- Drag-and-drop image uploader with client + server validation and upload progress
- Manage a gallery: rename, edit description, add/remove images, reorder via drag-and-drop,
  change visibility, set or change a password, delete the gallery
- Unique, collision-resistant gallery slug and public URL generated automatically
- High-resolution QR code, downloadable as PNG or SVG
- Dashboard with stats, search, empty states, and loading skeletons

**Visitors**
- No account needed — scan the QR code or open the link
- Responsive, mobile-first gallery grid (2 columns on mobile, 3 on tablet, 4 on desktop)
- Fullscreen lightbox with keyboard navigation (Esc / ← / →) and touch swipe
- Download any single image, or download the whole gallery as a ZIP
- Password gate for protected galleries
- Native share sheet (Web Share API) with clipboard fallback

## Tech Stack

- [Next.js](https://nextjs.org) (App Router, Turbopack) + TypeScript + React
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (built on [Base UI](https://base-ui.com)) + [Lucide](https://lucide.dev) icons
- [Prisma](https://www.prisma.io) + PostgreSQL (via `@prisma/adapter-pg`)
- [Auth.js (NextAuth v5)](https://authjs.dev) with a Credentials provider
- [Zod](https://zod.dev) + [React Hook Form](https://react-hook-form.com)
- [qrcode](https://www.npmjs.com/package/qrcode) for QR generation
- [archiver](https://www.npmjs.com/package/archiver) for on-the-fly ZIP downloads
- [@dnd-kit](https://dndkit.com) for drag-and-drop image reordering
- [Framer Motion](https://www.framer.com/motion/) for the lightbox transition
- [Nodemailer](https://nodemailer.com) for SMTP email (verification + password reset)

## Installation

```bash
npm install
```

## PostgreSQL Setup

You need a running PostgreSQL instance. Two easy options:

**Docker (recommended for local dev)**

```bash
docker run -d --name qr-gallery-db \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=qr_gallery \
  -p 5432:5432 postgres:16-alpine
```

> If port `5432` is already taken by another local PostgreSQL install, map to a free port
> instead (e.g. `-p 5433:5432`) and update `DATABASE_URL` accordingly.

**Local PostgreSQL** — create a database named `qr_gallery` and use your own
username/password/port in `DATABASE_URL`.

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qr_gallery?schema=public"
AUTH_SECRET="replace-with-a-secure-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Generate a secure `AUTH_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`NEXT_PUBLIC_APP_URL` is embedded in every QR code as the gallery's public URL — set it to
your deployed domain in production. It's also used to build the links in verification and
password-reset emails.

### SMTP (email)

```bash
SMTP_HOST=""
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM="QR Gallery <no-reply@yourdomain.com>"
```

These are **optional in development** — if `SMTP_HOST` is left blank, the mailer
(`src/lib/mailer.ts`) automatically creates a disposable [Ethereal](https://ethereal.email)
test inbox on first send and logs a preview URL to the console, so verification/reset emails
are still fully testable without a real mail provider. In production, set all five `SMTP_*`
variables to a real provider (e.g. SMTP credentials from Postmark, Resend, SES, Gmail with an
app password, etc.) — otherwise no real email will be delivered.

## Prisma Setup

```bash
npm run db:generate   # generate the Prisma client
npm run db:migrate    # create/apply migrations against your local database
```

Other useful commands:

```bash
npm run db:studio     # open Prisma Studio to browse data
npm run db:deploy     # apply existing migrations in production (no schema changes)
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

```bash
npm run build
npm run start
```

## Architecture

```
Next.js (App Router)
   │
   ├── Server Components  → read data directly via Prisma (galleries, images metadata)
   ├── API Route Handlers → mutations, uploads, downloads, auth (Zod-validated, ownership-checked)
   │
   ▼
Prisma Client (driver adapter: @prisma/adapter-pg)
   │
   ▼
PostgreSQL
   ├── User, Gallery tables
   └── Image table — binary data stored as BYTEA (Prisma `Bytes`)
```

**Image storage** is behind a small abstraction (`src/lib/storage/image-storage.ts`), currently
implemented by `postgres-image-storage.ts`. Nothing in the UI or gallery logic talks to
PostgreSQL `BYTEA` directly — everything goes through `saveImage()` / `getImage()` /
`deleteImage()` / `getGalleryImages()`. Metadata queries (used for gallery lists and grids)
always `select` only metadata columns and never fetch `data`, so listing a gallery with 50
images doesn't pull 100 MB of binary data over the wire. The binary is only read from the
database when an image or a ZIP is actually requested.

**Authentication** uses Auth.js with a Credentials provider and JWT sessions (no separate
session table). Passwords are hashed with bcrypt (12 rounds). Because Prisma's Node-only
driver adapter can't run in the Edge runtime, the app splits the NextAuth config into
`src/auth.config.ts` (Edge-safe, used by `src/proxy.ts` to protect `/dashboard/*`) and
`src/auth.ts` (full config with the Credentials provider, used by API routes and Server
Components).

**Authorization** is re-checked on every mutating request — `src/lib/authorize.ts` loads a
gallery or image only if it belongs to the authenticated user, and every API route uses it
before touching data. Gallery/image ids from the client are never trusted on their own.

**Password-protected galleries** use a short-lived, HMAC-signed cookie
(`src/lib/gallery-access.ts`) scoped to a single gallery, set only after the password is
verified server-side with bcrypt. The password hash is never sent to the client.

**Email verification & password reset** use single-use, expiring tokens stored in the
`VerificationToken` table (`src/lib/verification-tokens.ts`) — 24h for email verification,
1h for password reset. Requesting a new token invalidates any outstanding one of the same
type, and consuming a token deletes it, so links can't be replayed. The forgot-password
endpoint always returns the same response whether or not the email is registered, to avoid
leaking which addresses have accounts.

## API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account (also sends a verification email) |
| * | `/api/auth/[...nextauth]` | Auth.js sign-in/sign-out/session handlers |
| POST | `/api/auth/verify-email/resend` | Resend the verification email (authenticated) |
| POST | `/api/auth/forgot-password` | Request a password-reset email |
| POST | `/api/auth/reset-password` | Consume a reset token and set a new password |
| GET/POST | `/api/galleries` | List / create galleries (owner only) |
| GET/PATCH/DELETE | `/api/galleries/[id]` | Read / update / delete a gallery (owner only) |
| POST | `/api/galleries/[id]/images` | Upload images to a gallery (owner only) |
| PATCH | `/api/galleries/[id]/images/reorder` | Persist new image order (owner only) |
| GET | `/api/galleries/[id]/qr` | Download the gallery QR as PNG or SVG (owner only) |
| POST | `/api/galleries/[id]/verify-password` | Verify a public gallery's password (`id` here is the gallery's slug) |
| GET | `/api/galleries/[id]/download-all` | Download all images as a ZIP (`id` here is the gallery's slug) |
| GET | `/api/images/[id]` | Serve an image's binary data (authorization-checked) |
| GET | `/api/images/[id]/download` | Download the original image file |
| DELETE | `/api/images/[id]` | Delete an image (owner only) |

## Limits

Configured in `src/lib/constants.ts` and enforced both client- and server-side:

- Allowed formats: JPG, JPEG, PNG
- Max file size: 5 MB per image
- Max images per gallery: 50
- Max total gallery size: 100 MB

## Local Setup — Quick Start

```bash
npm install
docker run -d --name qr-gallery-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=qr_gallery -p 5432:5432 postgres:16-alpine
cp .env.example .env   # then edit AUTH_SECRET
npm run db:generate
npm run db:migrate
npm run dev
```

## Limitations

- **Images are stored as PostgreSQL `BYTEA`.** This keeps the app entirely free to run (no
  S3/Cloudinary/Firebase account needed) and is fine for personal or small-scale use, but it
  means database size grows with photo uploads and very large databases can get slower to
  back up/restore than pairing a small metadata DB with object storage. The configured limits
  (5 MB/image, 50 images, 100 MB/gallery) keep this workable for the MVP.
- No rate limiting on auth or upload endpoints yet — including forgot-password, which is
  otherwise the most enumeration/abuse-sensitive endpoint in the app.
- Verified users can still sign in and use the app before verifying their email; verification
  is currently informational (shown in Settings), not gate-kept.
- The gallery-password session is a single HMAC-signed cookie per gallery (24h) rather than a
  server-side session table — sufficient for casual protection, not bank-grade.

## Future Improvements

- Swap `PostgresImageStorage` for an `S3ImageStorage` (or R2/Cloudinary) implementation of the
  same `ImageStorage` interface once traffic/storage size justifies it — no other code needs
  to change.
- Add rate limiting to auth and upload routes.
- Background/streaming ZIP generation for very large galleries instead of building the archive
  in memory.
- Gate dashboard/gallery-creation access behind a verified email, and rate-limit auth endpoints.
