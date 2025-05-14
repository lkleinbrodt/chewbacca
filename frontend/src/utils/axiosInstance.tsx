import Cookies from "js-cookie";
import { authService } from "@/services/auth";
import axios from "axios";

// Create an axios instance with base URL and default configuration
const axiosInstance = axios.create({
  baseURL: `${import.meta.env.VITE_BASE_URL}api`, // Base URL for all API calls
  withCredentials: true, // Send cookies with requests
});

// Flag to prevent multiple concurrent token refresh attempts
let isRefreshing = false;
// Array to hold all requests that are waiting for token refresh
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Add a request interceptor to inject the JWT token into the headers
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = Cookies.get("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Handle CSRF token for refresh endpoint in production
    // This is needed when JWT_COOKIE_CSRF_PROTECT = True in Flask-JWT-Extended config
    if (config.url === "/auth/refresh" && config.method === "post") {
      const csrfToken = Cookies.get("csrf_refresh_token");
      if (csrfToken) {
        // Send CSRF token in header for refresh requests to prevent CSRF attacks
        config.headers["X-CSRF-TOKEN"] = csrfToken;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if it's a 401 error and not a retry request and not the refresh token request itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== "/auth/refresh"
    ) {
      originalRequest._retry = true; // Mark it as a retry

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          // Use auth service to refresh the token
          const data = await authService.refreshToken();
          const newAccessToken = data.access_token;

          // Update authorization header for the original request
          axiosInstance.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${newAccessToken}`;
          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          return axiosInstance(originalRequest); // Retry the original request
        } catch (refreshError) {
          processQueue(refreshError, null);

          // If refresh fails, logout the user
          try {
            await authService.logout();
          } catch (logoutErr) {
            console.error(
              "Error calling logout during refresh failure:",
              logoutErr
            );
          }

          localStorage.setItem(
            "authError",
            "Session expired. Please login again."
          );
          window.location.href = "/"; // Redirect to home/login
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // If token is already refreshing, queue the original request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }
    }
    return Promise.reject(error);
  }
);

// Helper function to handle streaming responses
export const streamResponse = async (
  url: string,
  data: Record<string, unknown>,
  onData: (data: Record<string, unknown>) => void,
  onError: (error: unknown) => void,
  onComplete: () => void
) => {
  try {
    const response = await fetch(`${axiosInstance.defaults.baseURL}${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${Cookies.get("accessToken")}`,
      },
      body: JSON.stringify(data),
      credentials: "include", // This is equivalent to axios's withCredentials
      mode: "cors", // Explicitly set CORS mode
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const message = buffer.substring(0, boundary);
        buffer = buffer.substring(boundary + 2);

        if (message.startsWith("data:")) {
          const dataString = message.substring(5).trim();
          if (dataString) {
            try {
              const data = JSON.parse(dataString);
              onData(data);
            } catch (e) {
              console.error(`Error parsing stream JSON:`, e);
            }
          }
        }

        boundary = buffer.indexOf("\n\n");
      }
    }

    onComplete();
  } catch (error) {
    onError(error);
  }
};

export default axiosInstance;
