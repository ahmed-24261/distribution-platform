import crypto from "crypto";

export const calculateFileHash = (fileData) => {
  return crypto.createHash("sha256").update(fileData).digest("hex");
};
