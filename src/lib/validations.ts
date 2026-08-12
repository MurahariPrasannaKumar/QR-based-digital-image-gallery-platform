import { z } from "zod";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/lib/constants";

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().trim().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createGallerySchema = z
  .object({
    name: z.string().trim().min(1, "Gallery name is required").max(100),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    isPublic: z.boolean(),
    password: z.string().max(72).optional().or(z.literal("")),
  })
  .refine((data) => data.isPublic || (data.password && data.password.length >= 4), {
    message: "Password must be at least 4 characters",
    path: ["password"],
  });

export type CreateGalleryInput = z.infer<typeof createGallerySchema>;

export const updateGallerySchema = z.object({
  name: z.string().trim().min(1, "Gallery name is required").max(100).optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  isPublic: z.boolean().optional(),
  password: z.string().max(72).optional().or(z.literal("")),
});

export type UpdateGalleryInput = z.infer<typeof updateGallerySchema>;

export const verifyPasswordSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const reorderImagesSchema = z.object({
  imageIds: z.array(z.string()).min(1),
});

const presignFileSchema = z.object({
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.enum(ALLOWED_IMAGE_TYPES),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(MAX_IMAGE_SIZE, "This image is larger than 5 MB."),
});

export const presignUploadSchema = z.object({
  files: z.array(presignFileSchema).min(1).max(50),
});

export type PresignUploadInput = z.infer<typeof presignUploadSchema>;

const confirmFileSchema = z.object({
  storageKey: z.string().trim().min(1),
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.enum(ALLOWED_IMAGE_TYPES),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(MAX_IMAGE_SIZE, "This image is larger than 5 MB."),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
});

export const confirmUploadSchema = z.object({
  files: z.array(confirmFileSchema).min(1).max(50),
});

export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function validateImageFile(file: { type: string; size: number; name: string }) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return "Only JPG, JPEG and PNG files are supported.";
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return "This image is larger than 5 MB.";
  }
  return null;
}
