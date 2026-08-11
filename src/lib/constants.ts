export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"] as const;

export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"] as const;

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB per image

export const MAX_IMAGES_PER_GALLERY = 50;

export const MAX_GALLERY_SIZE = 100 * 1024 * 1024; // 100 MB per gallery

export const GALLERY_SESSION_COOKIE_PREFIX = "gallery_session_";

export const APP_NAME = "QR Gallery";

// Rate limits: [max requests, window in milliseconds]. See src/lib/rate-limit.ts.
export const RATE_LIMITS = {
  register: [5, 15 * 60 * 1000] as const,
  forgotPassword: [5, 15 * 60 * 1000] as const,
  resetPassword: [10, 15 * 60 * 1000] as const,
  resendVerification: [3, 15 * 60 * 1000] as const,
  uploadPresign: [30, 5 * 60 * 1000] as const,
  uploadConfirm: [60, 5 * 60 * 1000] as const,
};
