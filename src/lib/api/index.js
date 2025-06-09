import crypto from "crypto";
import { getUserByIdWithPermissions } from "@/lib/user";

export const getUser = async () => {
  const userId = "0113b4c0-7f97-452a-9985-b1f7eecfeaa7";

  const user = await getUserByIdWithPermissions(userId);

  return user;
};

export const calculateFileHash = (fileData) => {
  return crypto.createHash("sha256").update(fileData).digest("hex");
};
