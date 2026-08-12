export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"] as const;

export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"] as const;

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB per image

export const MAX_IMAGES_PER_GALLERY = 50;

export const MAX_GALLERY_SIZE = 100 * 1024 * 1024; // 100 MB per gallery

export const GALLERY_SESSION_COOKIE_PREFIX = "gallery_session_";

export const APP_NAME = "QR Gallery";

// Rate limits: [max requests, window in milliseconds]. See src/lib/rate-limit.ts.
// Registration/login/password-reset/email-verification are handled directly
// by Firebase Auth from the client now, so they're no longer rate-limited here.
export const RATE_LIMITS = {
  uploadPresign: [30, 5 * 60 * 1000] as const,
  uploadConfirm: [60, 5 * 60 * 1000] as const,
};
