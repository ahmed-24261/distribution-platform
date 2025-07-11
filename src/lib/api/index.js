import { getUserIdByUsername, getUserByIdWithPermissions } from "@/lib/user";

export const getUser = async () => {
  // change this two lines by cookies.getUser()

  const username = "admin1";

  const userId = await getUserIdByUsername(username);

  const user = await getUserByIdWithPermissions(userId);

  return user;
};
