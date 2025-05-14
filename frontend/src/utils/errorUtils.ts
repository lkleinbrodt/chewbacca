import axios, { AxiosError } from "axios";

export type ApiErrorType =
  | "validation"
  | "auth"
  | "server"
  | "network"
  | "unknown";

export interface ApiErrorResponse {
  type: ApiErrorType;
  message: string;
  errors?: Record<string, string[]>;
}

interface ErrorResponseData {
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Handles API errors and returns a standardized error response
 */
export const handleApiError = (error: unknown): ApiErrorResponse => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ErrorResponseData>;

    if (axiosError.response) {
      // Server responded with a status code outside of 2xx range
      const { status, data } = axiosError.response;

      if (status === 400) {
        return {
          type: "validation",
          message: data?.message || "Validation error",
          errors: data?.errors || {},
        };
      } else if (status === 401) {
        return {
          type: "auth",
          message: "Authentication required",
        };
      } else if (status === 403) {
        return {
          type: "auth",
          message: "You don't have permission to perform this action",
        };
      } else if (status === 404) {
        return {
          type: "server",
          message: "Resource not found",
        };
      } else {
        return {
          type: "server",
          message: data?.message || `Server error (${status})`,
        };
      }
    } else if (axiosError.request) {
      // Request was made but no response received
      return {
        type: "network",
        message: "Network error - please check your connection",
      };
    }
  }

  // Something else happened
  const errorMessage =
    error instanceof Error ? error.message : "An unknown error occurred";
  return {
    type: "unknown",
    message: errorMessage,
  };
};

/**
 * Extracts form field errors from an API error response
 */
export const getFormErrors = (
  apiError: ApiErrorResponse
): Record<string, string> => {
  if (apiError.type !== "validation" || !apiError.errors) {
    return {};
  }

  const formErrors: Record<string, string> = {};

  // Convert API error format (field => string[]) to form error format (field => string)
  Object.entries(apiError.errors).forEach(([field, messages]) => {
    if (messages && messages.length > 0) {
      formErrors[field] = messages[0];
    }
  });

  return formErrors;
};

/**
 * Format validation errors for display in forms
 */
export const formatValidationErrors = (
  errors: Record<string, string[]>
): string => {
  if (!errors || Object.keys(errors).length === 0) {
    return "Invalid data provided";
  }

  return Object.entries(errors)
    .map(([field, messages]) => {
      const fieldName = field.replace(/_/g, " ");
      return `${fieldName}: ${messages.join(", ")}`;
    })
    .join("\n");
};

/**
 * Generic error handler for async functions
 */
export const withErrorHandling = async <T>(
  asyncFn: () => Promise<T>,
  onError?: (error: ApiErrorResponse) => void
): Promise<T | null> => {
  try {
    return await asyncFn();
  } catch (error) {
    const apiError = handleApiError(error);

    if (onError) {
      onError(apiError);
    } else {
      console.error(apiError.message);
    }

    return null;
  }
};
