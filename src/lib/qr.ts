import QRCode from "qrcode";

export function getGalleryUrl(slug: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/g/${slug}`;
}

export async function generateQrPngDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 1024,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
}

export async function generateQrSvgString(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 2,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
}

export async function generateQrPngBuffer(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 1024,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
}
