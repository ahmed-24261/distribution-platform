import validate from "uuid-validate";
import { getUploadById } from "@/lib/upload";

export const validatePostRequest = async (request) => {
  const { id, task } = await request.json();

  const validTasks = ["process"];

  if (!id) {
    return {
      valid: false,
      message: "Bad request: 'id' required",
      status: 400,
    };
  }
  if (!task) {
    return {
      valid: false,
      message: "Bad request: 'task' required",
      status: 400,
    };
  }

  const validateId = validate(id, 4);
  if (!validateId) {
    return {
      valid: false,
      message: "Bad request: 'id' should be a valid uuid",
      status: 400,
    };
  }

  if (!validTasks.includes(task)) {
    return {
      valid: false,
      message: "Bad request: 'task' invalid",
      status: 400,
    };
  }

  return { valid: true, output: { id, task } };
};
