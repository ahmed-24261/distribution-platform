import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import crypto from "crypto";
import JSZip from "jszip";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function calculateFileHash(fileData) {
  return crypto.createHash("sha256").update(fileData).digest("hex");
}

export const createZipBuffer = async (fileBuffers, fileNames) => {
  const zip = new JSZip();

  for (let i = 0; i < fileBuffers.length; i++) {
    zip.file(fileNames[i], fileBuffers[i]);
  }
  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

  return zipBuffer;
};
