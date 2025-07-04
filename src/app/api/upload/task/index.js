import { validate as isUUID } from "uuid";

export const validatePostRequest = async (request) => {
  const { id, task } = await request.json();

  const validTasks = ["process"];

  if (!id) {
    return {
      success: false,
      data: null,
      message: "Bad request: 'id' required",
    };
  }
  if (!task) {
    return {
      success: false,
      data: null,
      message: "Bad request: 'task' required",
    };
  }

  const invalidId = !isUUID(id, 4);
  if (invalidId) {
    return {
      success: false,
      data: null,
      message: "Bad request: 'id' must be a valid UUID",
    };
  }

  if (!validTasks.includes(task)) {
    return {
      success: false,
      data: null,
      message: "Bad request: 'task' invalid",
    };
  }

  return { success: true, data: { id, task } };
};
