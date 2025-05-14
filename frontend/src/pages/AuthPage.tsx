import { authService } from "@/services/auth";
import { isValidRedirectPath } from "@/utils/routes";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const AuthPage = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const next = searchParams.get("next") || "/";

    // Validate the access token exists
    if (!accessToken) {
      localStorage.setItem(
        "authError",
        "Login failed: No access token received."
      );
      window.location.href = "/";
      return;
    }

    const redirectTo = isValidRedirectPath(next) ? next : "/";

    try {
      // Use the service to handle storing the token and parsing user info
      authService.handleLoginSuccess(accessToken);

      // Force a full page reload to ensure AuthContext re-initializes
      window.location.href = redirectTo;
    } catch (error) {
      console.error("Failed to process login:", error);
      localStorage.setItem("authError", "Login failed: Invalid token format.");
      window.location.href = "/";
    }
  }, [searchParams]);

  // Show a loading indicator while processing
  return <div>Processing authentication...</div>;
};

export default AuthPage;
