import { S3Client } from "@aws-sdk/client-s3";

/**
 * R2 is exposed through the S3-compatible API, so any S3-compatible SDK/
 * endpoint works here — including MinIO for local development/testing.
 * Set R2_ENDPOINT to override the endpoint (used for local MinIO); in
 * production, only R2_ACCOUNT_ID is needed and the endpoint is derived.
 */
let client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (client) return client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY are not configured.");
  }

  const endpoint =
    process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  if (!endpoint) {
    throw new Error("R2_ACCOUNT_ID or R2_ENDPOINT must be set.");
  }

  client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    // R2 (and MinIO) work best with path-style addressing.
    forcePathStyle: true,
  });

  return client;
}

export function getR2BucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME is not configured.");
  return bucket;
}
