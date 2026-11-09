import "server-only";
import QRCode from "qrcode";

/** The QR encodes only the unguessable per-participant token. */
export async function qrPng(token: string): Promise<Buffer> {
  return QRCode.toBuffer(token, { width: 360, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0a1f5c", light: "#ffffff" } });
}

export async function qrSvg(token: string): Promise<string> {
  return QRCode.toString(token, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0a1f5c", light: "#ffffff" } });
}
