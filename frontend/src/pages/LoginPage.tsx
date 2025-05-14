// import "./LoginPage.css";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const Login = () => {
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";
  const { login } = useAuth();
  const handleSignIn = () => {
    login(from);
  };

  useEffect(() => {
    handleSignIn();
  });

  return (
    <div className="loginContainer">
      <button className="signInButton" onClick={handleSignIn}>
        Sign In with Google
      </button>
    </div>
  );
};

export default Login;
