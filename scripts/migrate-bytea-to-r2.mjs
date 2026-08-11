// One-time data migration: moves any Image rows that still have BYTEA
// `data` (from before the app switched to Cloudflare R2) into R2, then
// sets `storageKey` so the row is servable through the new storage path.
//
// Safe to re-run: it only processes rows where `storageKey IS NULL AND
// data IS NOT NULL`, and only clears `data` after the R2 upload succeeds.
// Run this BEFORE applying a migration that drops the `data` column.
//
// Usage:
//   npx tsx scripts/migrate-bytea-to-r2.mjs
//
// Requires DATABASE_URL and the R2_* env vars (see .env.example) to be set.

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const MIME_TO_EXTENSION = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
};

function buildStorageKey(galleryId, mimeType) {
  const ext = MIME_TO_EXTENSION[mimeType] ?? "bin";
  return `galleries/${galleryId}/${crypto.randomUUID()}.${ext}`;
}

function getS3Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY are not configured.");
  }
  const endpoint =
    process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
  if (!endpoint) throw new Error("R2_ACCOUNT_ID or R2_ENDPOINT must be set.");

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

async function main() {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME is not configured.");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });
  const s3 = getS3Client();

  const rows = await db.$queryRawUnsafe(
    `SELECT id, "galleryId", "mimeType", data FROM "Image" WHERE "storageKey" IS NULL AND data IS NOT NULL`
  );

  console.log(`Found ${rows.length} image(s) to migrate from BYTEA to R2.`);

  let migrated = 0;
  const failed = [];

  for (const row of rows) {
    const storageKey = buildStorageKey(row.galleryId, row.mimeType);
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: storageKey,
          Body: row.data,
          ContentType: row.mimeType,
        })
      );

      await db.image.update({
        where: { id: row.id },
        data: { storageKey, data: null },
      });

      migrated++;
      console.log(`  ✓ ${row.id} -> ${storageKey}`);
    } catch (err) {
      failed.push(row.id);
      console.error(`  ✗ ${row.id} failed:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nMigrated: ${migrated}/${rows.length}`);
  if (failed.length > 0) {
    console.error(`Failed (still has BYTEA data, re-run this script to retry): ${failed.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log("All rows migrated. It is now safe to apply the migration that drops the `data` column.");
  }

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
