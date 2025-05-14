import "./App.css";

import { BrowserRouter, Route, Routes } from "react-router-dom";

import AuthPage from "@/pages/AuthPage";
import { AuthProvider } from "./contexts/AuthContext";
import CalendarPage from "./pages/tasks/CalendarPage";
import Layout from "./components/common/Layout";
import Login from "./pages/LoginPage";
import TaskListPage from "./pages/tasks/TaskListPage";
// import PrivateRoute from "./components/PrivateRoute";
import { ThemeProvider } from "./components/theme-provider";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<TaskListPage />} />
              <Route path="tasks" element={<TaskListPage />} />
              <Route path="calendar" element={<CalendarPage />} />
            </Route>

            {/* <Route element={<PrivateRoute />}>
              <Route path="/" element={<Landing />} />
            </Route> */}
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
