import { useState } from "react";
import { Button, Space, Typography } from "antd";
import { AppLayout } from "./components/AppLayout";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Home from "./pages/Home";
import ClosedClientFiles from "./pages/ClosedClientFiles";
import MasterRoster from "./pages/MasterRoster";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AnimatePresence, motion } from "framer-motion";
import Grantmaking from "./pages/Grantmaking";
import Settings from "./pages/Settings";
import Networking from "./pages/Networking";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{ minHeight: "100%" }}
      >
        <Routes location={location}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route element={<AppLayout />}>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home />} />
              <Route path="/roster" element={<MasterRoster />} />
              <Route path="/grantmaking" element={<Grantmaking />} />
              <Route path="/networking" element={<Networking />} />
              <Route path="/closed" element={<ClosedClientFiles />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export function App() {
  const [count, setCount] = useState(0);

  return (
    <BrowserRouter>
      <AnimatedRoutes />
      <Space
        direction="vertical"
        size={8}
        style={{ width: "100%", display: "none" }}
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          Dashboard
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Vite + React + TypeScript + Ant Design + Supabase
        </Typography.Paragraph>
        <Button type="primary" onClick={() => setCount((v) => v + 1)}>
          Clicked {count} times
        </Button>
      </Space>
    </BrowserRouter>
  );
}
