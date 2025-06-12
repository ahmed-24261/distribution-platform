import crypto from "crypto";
import fs from "fs";

export const calculateFileHash = async (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (err) => reject(err));
  });
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
