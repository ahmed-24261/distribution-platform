import { getUserByUsername, getUserByIdWithPermissions } from "@/lib/user";

export const getUser = async () => {
  // change this two lines by cookies.getUser()

  const username = "user2";
  const response = await getUserByUsername(username);
  if (response.ok) {
    const { id: userId } = response.data;
    const userResponse = await getUserByIdWithPermissions(userId);
    if (userResponse.ok) {
      return userResponse.data;
    }
    return null;
  }

  return null;
};
