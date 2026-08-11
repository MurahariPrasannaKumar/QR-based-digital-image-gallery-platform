import crypto from "crypto";
import { cookies } from "next/headers";
import { GALLERY_SESSION_COOKIE_PREFIX } from "@/lib/constants";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return secret;
}

function sign(galleryId: string): string {
  return crypto.createHmac("sha256", getSecret()).update(galleryId).digest("hex");
}

export async function grantGalleryAccess(galleryId: string) {
  const store = await cookies();
  store.set(`${GALLERY_SESSION_COOKIE_PREFIX}${galleryId}`, sign(galleryId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function hasGalleryAccess(galleryId: string): Promise<boolean> {
  const store = await cookies();
  const token = store.get(`${GALLERY_SESSION_COOKIE_PREFIX}${galleryId}`)?.value;
  if (!token) return false;
  const expected = sign(galleryId);
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
