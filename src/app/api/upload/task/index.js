import validate from "uuid-validate";

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

  const validateId = validate(id, 4);
  if (!validateId) {
    return {
      success: false,
      data: null,
      message: "Bad request: 'id' should be a valid uuid",
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
