import { S3Client } from "@aws-sdk/client-s3";

/**
 * Supabase Storage exposes an S3-compatible API, so the same AWS SDK calls
 * used for R2 work here unchanged. Endpoint + credentials come from the
 * Supabase dashboard: Project Settings -> Storage -> S3 Connection.
 */
let client: S3Client | null = null;

export function getSupabaseStorageClient(): S3Client {
  if (client) return client;

  const endpoint = process.env.SUPABASE_S3_ENDPOINT;
  const region = process.env.SUPABASE_S3_REGION;
  const accessKeyId = process.env.SUPABASE_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SUPABASE_S3_SECRET_ACCESS_KEY;

  if (!endpoint) {
    throw new Error("SUPABASE_S3_ENDPOINT is not configured.");
  }
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("SUPABASE_S3_ACCESS_KEY_ID / SUPABASE_S3_SECRET_ACCESS_KEY are not configured.");
  }

  client = new S3Client({
    region: region || "us-east-1",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    // Supabase Storage's S3-compatible endpoint requires path-style addressing.
    forcePathStyle: true,
  });

  return client;
}

export function getSupabaseBucketName(): string {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (!bucket) throw new Error("SUPABASE_STORAGE_BUCKET is not configured.");
  return bucket;
}
