import { validate as isUUID } from "uuid";

export const validateGETRequest = (request) => {
  const { searchParams } = new URL(request.url);

  const id = searchParams.getAll("id");
  const task = searchParams.getAll("task");

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

  return { success: true, data: { id, task } };
};
