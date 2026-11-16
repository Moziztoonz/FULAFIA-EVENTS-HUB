import QRCode from "qrcode";
import fs from "node:fs/promises";
import path from "node:path";
import { contentTypeFor, uploadRoot } from "./storage";

export async function qrDataUrl(text: string, flyerPath?: string | null): Promise<string> {
  if (!flyerPath) {
    return QRCode.toDataURL(text, {
      width: 520,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#10241b", light: "#ffffff" },
    });
  }

  const safeName = path.basename(flyerPath);
  if (safeName !== flyerPath || !/^[a-zA-Z0-9._-]+$/.test(safeName)) {
    throw new Error("The associated event flyer path is invalid.");
  }
  const flyer = await fs.readFile(path.join(uploadRoot, "events", safeName));
  const mime = contentTypeFor(safeName);
  const svg = await QRCode.toString(text, {
    type: "svg",
    width: 520,
    margin: 4,
    errorCorrectionLevel: "H",
    color: { dark: "#10241b", light: "#ffffff" },
  });
  const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!viewBox) throw new Error("Could not read the generated QR code dimensions.");

  const width = Number(viewBox[1]);
  const height = Number(viewBox[2]);
  const badgeSize = Math.min(width, height) * 0.19;
  const imageSize = badgeSize * 0.72;
  const x = (width - badgeSize) / 2;
  const y = (height - badgeSize) / 2;
  const imageX = (width - imageSize) / 2;
  const imageY = (height - imageSize) / 2;
  const embeddedFlyer = `data:${mime};base64,${flyer.toString("base64")}`;
  const brandedSvg = svg.replace(
    "</svg>",
    `<rect x="${x}" y="${y}" width="${badgeSize}" height="${badgeSize}" rx="${badgeSize * 0.16}" fill="#ffffff" stroke="#ffffff" stroke-width="${badgeSize * 0.08}"/><image href="${embeddedFlyer}" x="${imageX}" y="${imageY}" width="${imageSize}" height="${imageSize}" preserveAspectRatio="xMidYMid slice"/></svg>`,
  );
  return `data:image/svg+xml;base64,${Buffer.from(brandedSvg).toString("base64")}`;
}
