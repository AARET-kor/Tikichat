import QRCode from "qrcode";

const MAX_QR_PAYLOAD_LENGTH = 2048;

export function normalizeQrPayload(payload = "") {
  const value = String(payload || "").trim();
  if (!value) {
    throw new Error("QR payload required");
  }
  if (value.length > MAX_QR_PAYLOAD_LENGTH) {
    throw new Error("QR payload too long");
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("QR payload must be a valid URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("QR payload must be an http or https URL");
  }

  return parsed.toString();
}

export function buildQrSvgHeaders() {
  return {
    "Content-Type": "image/svg+xml; charset=utf-8",
    "Cache-Control": "private, max-age=300",
  };
}

export async function generateQrSvg(payload = "") {
  const normalized = normalizeQrPayload(payload);
  return QRCode.toString(normalized, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 180,
  });
}
