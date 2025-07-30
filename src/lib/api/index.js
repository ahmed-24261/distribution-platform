import { getUserByUsername, getUserByIdWithPermissions } from "@/lib/user";
import { isUUID } from "validator";

export const getUser = async () => {
  // change this two lines by cookies.getUser()

  const username = "admin2";

  const { id: userId } = await getUserByUsername(username);

  const user = await getUserByIdWithPermissions(userId);

  return user;
};

export class RequestValidation {
  #request;
  #options;
  #data = null;

  constructor(request, options) {
    this.#request = request;
    this.#options = options;
  }

  async init() {
    await this.#fetchData();
    return this;
  }

  async validate() {
    const { isSearchParams, isFormData, isJsonData, fields } = this.#options;

    if (isSearchParams) {
      const { searchParams } = new URL(this.#request.url);

      for (const [fieldName, fieldOptions] of Object.entries(fields)) {
        const { required, type } = fieldOptions;

        const fieldValues = searchParams.getAll(fieldName);

        if (required && !fieldValues.length) {
          return {
            isValid: false,
            message: `Bad request: '${fieldName}' is required`,
          };
        }

        const isValidType = fieldValues.every((value) =>
          this.#typeValidation(value, type)
        );

        if (!isValidType) {
          return {
            isValid: false,
            message: `Bad request: invalid type for '${fieldName}' (expected '${type}')`,
          };
        }
      }

      return { isValid: true, message: null };
    } else if (isFormData) {
      const formData = this.#data;

      for (const [fieldName, fieldOptions] of Object.entries(fields)) {
        const { required, type } = fieldOptions;

        const fieldValues = formData.getAll(fieldName);

        if (required && !fieldValues.length) {
          return {
            isValid: false,
            message: `Bad request: '${fieldName}' is required`,
          };
        }

        const isValidType = fieldValues.every((value) =>
          this.#typeValidation(value, type)
        );

        if (!isValidType) {
          return {
            isValid: false,
            message: `Bad request: invalid type for '${fieldName}' (expected '${type}')`,
          };
        }
      }

      return { isValid: true, message: null };
    } else if (isJsonData) {
      const jsonData = this.#data;

      const recursiveChecking = (data, options, racineField) => {
        const { required, type, fields } = options;

        if (required && !data) {
          return {
            isValid: false,
            message: `Bad request: ${
              racineField
                ? `'${racineField}' is required`
                : "Json data required"
            }`,
          };
        }

        const isValidType = this.#typeValidation(data, type);
        if (!isValidType) {
          return {
            isValid: false,
            message: `Bad request: ${
              racineField
                ? `invalid type for '${racineField}' (expected '${type}')`
                : "Array required"
            }`,
          };
        }

        if (required && fields) {
          const arrayData = Array.isArray(data) ? data : [data];

          for (const [fieldName, fieldOptions] of Object.entries(fields)) {
            const { required } = fieldOptions;
            if (required && !arrayData.length) {
              return {
                isValid: false,
                message: `Bad request: '${fieldName}' is required`,
              };
            }
            for (const elementData of arrayData) {
              const fieldValue = elementData[fieldName];

              const result = recursiveChecking(
                fieldValue,
                fieldOptions,
                fieldName
              );
              if (!result.isValid) return result;
            }
          }
        }

        return { isValid: true, message: null };
      };

      return recursiveChecking(jsonData, this.#options);
    } else {
      throw new Error("Request validation: No validation type specified");
    }
  }

  async get(field) {
    const { isSearchParams, isFormData, isJsonData } = this.#options;

    if (isSearchParams) {
      const { searchParams } = new URL(this.#request.url);
      return searchParams.get(field);
    } else if (isFormData) {
      const formData = this.#data;
      return formData.get(field);
    } else if (isJsonData && !field) {
      const jsonData = this.#data;
      return jsonData;
    } else {
      throw new Error("Request validation: get method can not be called");
    }
  }

  async getAll(field) {
    const { isSearchParams, isFormData, isJsonData } = this.#options;

    if (isSearchParams) {
      const { searchParams } = new URL(this.#request.url);
      return searchParams.getAll(field);
    } else if (isFormData) {
      const formData = this.#data;
      return formData.getAll(field);
    } else {
      throw new Error("Request validation: getAll method can not be called");
    }
  }

  #typeValidation(value, type) {
    switch (type) {
      case "UUIDv4":
        return isUUID(value, 4);
      case "number":
        return !isNaN(Number(value));
      case "array":
        return Array.isArray(value);
      case "object":
        return typeof value === "object" && !Array.isArray(value);
      default:
        return true;
    }
  }

  async #fetchData() {
    const { isSearchParams, isFormData, isJsonData } = this.#options;

    if (isSearchParams) {
      const { searchParams } = new URL(this.#request.url);
      this.#data = searchParams;
    } else if (isFormData) {
      this.#data = await this.#request.formData();
    } else if (isJsonData) {
      this.#data = await this.#request.json();
    } else {
      this.#data = null;
    }
  }
}
