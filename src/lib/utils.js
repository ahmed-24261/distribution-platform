import crypto from "crypto";

export const calculateFileHash = (fileData) => {
  return crypto.createHash("sha256").update(fileData).digest("hex");
};

export class HTTPError extends Error {
  constructor(message = "Internal error server", status = 500) {
    super(message);
    this.name = "HTTPError";
    this.status = status;
    this.message = message;
  }

  getMessage() {
    return this.message;
  }

  getStatus() {
    return this.status;
  }
}
