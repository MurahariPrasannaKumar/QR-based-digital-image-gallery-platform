import nodemailer, { type Transporter } from "nodemailer";
import { APP_NAME } from "@/lib/constants";

let transporterPromise: Promise<Transporter> | null = null;
let devFromAddress: string | null = null;

function createConfiguredTransporter(): Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
}

/**
 * When SMTP_HOST isn't configured (e.g. local dev), fall back to a disposable
 * Ethereal inbox so email flows are still testable — sendMail() logs a
 * preview URL to the console instead of silently doing nothing.
 */
async function createDevTransporter(): Promise<Transporter> {
  const testAccount = await nodemailer.createTestAccount();
  devFromAddress = testAccount.user;
  console.warn(
    `[mailer] SMTP_HOST not set — using a disposable Ethereal inbox for ${APP_NAME}. ` +
      "Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD to send real email."
  );
  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}

function getTransporter(): Promise<Transporter> {
  if (!transporterPromise) {
    transporterPromise = process.env.SMTP_HOST
      ? Promise.resolve(createConfiguredTransporter())
      : createDevTransporter();
  }
  return transporterPromise;
}

export async function sendMail(options: { to: string; subject: string; html: string }) {
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM ?? devFromAddress ?? `${APP_NAME} <no-reply@qrgallery.local>`;

  const info = await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.info(`[mailer] Preview: ${previewUrl}`);
  }

  return info;
}

function emailLayout(title: string, bodyHtml: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <p style="font-weight: 600; font-size: 16px; margin: 0 0 24px;">${APP_NAME}</p>
      <h1 style="font-size: 20px; margin: 0 0 16px;">${title}</h1>
      ${bodyHtml}
      <p style="color: #6b7280; font-size: 13px; margin-top: 32px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  await sendMail({
    to,
    subject: `Verify your email — ${APP_NAME}`,
    html: emailLayout(
      "Verify your email address",
      `
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
          Confirm this is your email address to finish setting up your account.
        </p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}" style="background:#111827;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
            Verify Email
          </a>
        </p>
        <p style="color: #9ca3af; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
      `
    ),
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await sendMail({
    to,
    subject: `Reset your password — ${APP_NAME}`,
    html: emailLayout(
      "Reset your password",
      `
        <p style="color: #374151; font-size: 14px; line-height: 1.6;">
          We received a request to reset your password. This link expires in 1 hour.
        </p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background:#111827;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
            Reset Password
          </a>
        </p>
        <p style="color: #9ca3af; font-size: 12px; word-break: break-all;">${resetUrl}</p>
      `
    ),
  });
}
