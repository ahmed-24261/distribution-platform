import { getUserByUsername, getUserByIdWithPermissions } from "@/lib/user";

export const getUser = async () => {
  const username = "admin2";
  const { id: userId } = await getUserByUsername(username);

  const user = await getUserByIdWithPermissions(userId);

  return user;
};
