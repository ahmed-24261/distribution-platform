import validate from "uuid-validate";

// --- GET request
export const validateGetRequest = (request) => {
  const { searchParams } = new URL(request.url);

  const ids = searchParams.getAll("id");
  const getFile = searchParams.get("getFile");

  const validateIds = ids.every((id) => validate(id, 4));
  if (!validateIds) {
    return {
      valid: false,
      message: "Bad request: all 'id' values must be valid UUIDv4 strings",
    };
  }

  if (getFile !== null && getFile !== true) {
    return {
      valid: false,
      message: "Bad request: 'getFile' should be set with true or unset",
    };
  }

  if (getFile && !ids.length) {
    return {
      valid: false,
      message: "Bad request: 'id' required with 'getFile'",
    };
  }

  return { valid: true, data: { ids, getFile } };
};

// --- PUT request
export const validatePutRequest = async (request) => {
  const jsonData = await request.json();

  const items = Array.isArray(jsonData) ? jsonData : [jsonData];

  for (const item of items) {
    const id = item?.idc;
    const update = item?.update;

    if (!id) {
      return {
        valid: false,
        message: "Bad request: 'id' required",
      };
    }

    if (!validate(id, 4)) {
      return {
        valid: false,
        message: "Bad request: 'id' must be valid UUIDv4 string",
      };
    }

    if (!update) {
      return {
        valid: false,
        message: "Bad request: 'update' required",
      };
    }

    return { valid: true, data: { items } };
  }
};

// --- DELETE request
export const validateDeleteRequest = (request) => {
  const { searchParams } = new URL(request.url);

  const ids = searchParams.getAll("id");

  if (!ids.length) {
    return {
      valid: false,
      message: "Bad request: missing required query parameter 'id'",
    };
  }

  const validateIds = ids.every((id) => validate(id, 4));
  if (!validateIds) {
    return {
      valid: false,
      message: "Bad request: all 'id' values must be valid UUIDv4 strings",
    };
  }

  return { valid: true, data: { ids } };
};
