import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import crypto from "crypto";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function calculateFileHash(fileData) {
  return crypto.createHash("sha256").update(fileData).digest("hex");
}

export class HTTPError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "HTTPError";
    this.message = message;
    this.status = status;
  }
  getMessage() {
    return this.message;
  }
  getStatus() {
    return this.status;
  }
}
