import type { AuthState, User } from "@/types/auth";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import Cookies from "js-cookie";
import { authService } from "@/services/auth";

interface AuthContextType extends AuthState {
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  login: (from?: string) => Promise<void>;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // Function to initialize auth state from cookies
  const initializeAuth = useCallback(() => {
    const userProfile = authService.getCurrentUserProfile();
    setState((prev) => ({
      ...prev,
      user: userProfile,
      loading: false,
    }));
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const handleSetUser = (newUser: User | null) => {
    setState((prev) => ({ ...prev, user: newUser, error: null }));
    if (newUser) {
      Cookies.set("user", JSON.stringify(newUser), {
        secure: import.meta.env.PROD,
        sameSite: "Lax",
      });
    } else {
      Cookies.remove("user");
    }
  };

  const logout = async () => {
    // Update local context state for immediate UI feedback
    //we dont do this, because our logic will clear the cookies then force a page refresh, and a page refresh will have it set the state using cookies
    // setState((prev) => ({
    //   ...prev,
    //   user: null,
    //   loading: false,
    //   error: null,
    // }));

    // Call authService.logout which will clear client cookies and trigger the redirect
    await authService.logout();
    // The page will be redirected by the backend, no need for additional navigation logic
  };

  const login = async (from: string = "/") => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      authService.initiateLogin("google", from);
    } catch (err) {
      console.error("Failed to initiate login:", err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: { message: "Failed to initiate login" },
      }));
    }
  };

  const isAuthenticated = useCallback(() => {
    return !!state.user && !!Cookies.get("accessToken");
  }, [state.user]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        setUser: handleSetUser,
        logout,
        login,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
