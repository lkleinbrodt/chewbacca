import Cookies from "js-cookie";
import type { User } from "@/types/auth";
import axiosInstance from "@/utils/axiosInstance";

// Define UserProfile type without the token, as token is managed separately
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  image: string;
}

// Response from the /auth/refresh endpoint
export interface RefreshAuthResponse {
  access_token: string;
}

export const authService = {
  /**
   * Initiates the OAuth login flow by redirecting to the backend.
   * @param provider - The OAuth provider (e.g., "google").
   * @param nextPath - The path to redirect to after successful login.
   */
  initiateLogin: (provider: string, nextPath: string = "/"): void => {
    const encodedPath = encodeURIComponent(nextPath);
    window.location.href = `${
      import.meta.env.VITE_BASE_URL
    }api/auth/authorize/${provider}?next=${encodedPath}`;
  },

  /**
   * Parses the access token received (typically from URL after backend callback)
   * and extracts user profile information.
   * Sets the access token in a cookie.
   * @param accessToken - The JWT access token string.
   * @returns The user's profile information.
   */
  handleLoginSuccess: (accessToken: string): UserProfile => {
    try {
      // Store the new access token (this is the primary place it's set initially)
      Cookies.set("accessToken", accessToken, {
        secure: import.meta.env.PROD,
        sameSite: "Lax",
      });

      const decodedPayload = JSON.parse(atob(accessToken.split(".")[1]));
      const userProfile: UserProfile = {
        id: decodedPayload.sub,
        email: decodedPayload.email,
        name: decodedPayload.name,
        image: decodedPayload.image || decodedPayload.picture, // Handle both
      };

      // Also update the 'user' cookie which AuthContext might read for initial state
      Cookies.set(
        "user",
        JSON.stringify({
          ...userProfile,
          token: accessToken, // Keep token in user object for backward compatibility
        }),
        {
          secure: import.meta.env.PROD,
          sameSite: "Lax",
        }
      );

      return userProfile;
    } catch (err) {
      console.error(
        "Invalid access token format during handleLoginSuccess:",
        err
      );
      Cookies.remove("accessToken"); // Clean up if token is bad
      Cookies.remove("user");
      throw new Error("Invalid access token format");
    }
  },

  /**
   * Calls the backend logout endpoint and clears client-side authentication data.
   */
  logout: async (): Promise<void> => {
    // Clear client-side auth data immediately for faster UI response
    authService.clearClientSideCookies();

    // Navigate to the backend logout endpoint which will handle redirect
    window.location.href = `${import.meta.env.VITE_BASE_URL}api/auth/logout`;
  },

  /**
   * Clears all client-side authentication cookies and storage.
   * Useful for immediate UI feedback during logout process.
   */
  clearClientSideCookies: (): void => {
    Cookies.remove("accessToken");
    Cookies.remove("user"); // User profile info
    localStorage.removeItem("authError"); // Any stored auth errors
  },

  /**
   * Retrieves the current user profile from cookies.
   * This is useful for initializing AuthContext state without re-parsing the token every time.
   */
  getCurrentUserProfile: (): User | null => {
    const userCookie = Cookies.get("user");
    const tokenCookie = Cookies.get("accessToken");

    if (userCookie && tokenCookie) {
      // Ensure token also exists, indicating a likely valid session
      try {
        return JSON.parse(userCookie) as User;
      } catch (e) {
        console.error("Failed to parse user cookie:", e);
        Cookies.remove("user"); // Clean up bad cookie
        return null;
      }
    }
    return null;
  },

  /**
   * Manually refresh the access token.
   * Note: This is now primarily handled by the axios interceptor.
   */
  refreshToken: async (): Promise<RefreshAuthResponse> => {
    try {
      const response = await axiosInstance.post<RefreshAuthResponse>(
        "/auth/refresh"
      );

      // Store the new access token
      if (response.data.access_token) {
        Cookies.set("accessToken", response.data.access_token, {
          secure: import.meta.env.PROD,
          sameSite: "Lax",
        });

        // Update user cookie if it exists
        const userCookie = Cookies.get("user");
        if (userCookie) {
          try {
            const user = JSON.parse(userCookie);
            user.token = response.data.access_token;
            Cookies.set("user", JSON.stringify(user), {
              secure: import.meta.env.PROD,
              sameSite: "Lax",
            });
          } catch (e) {
            console.error("Failed to update user cookie with new token:", e);
          }
        }
      }

      return response.data;
    } catch (err) {
      console.error("Failed to refresh token:", err);
      throw new Error("Failed to refresh token");
    }
  },
};
