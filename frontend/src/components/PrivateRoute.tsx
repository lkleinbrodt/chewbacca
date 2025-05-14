import { Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";

export default function PrivateRoute() {
  const { user, loading, login } = useAuth();
  const location = useLocation();

  // Wait for the authentication check to complete
  if (loading) {
    return null;
  }

  if (!user) {
    login(location.pathname);
    return null;
  }

  return <Outlet />;
}
