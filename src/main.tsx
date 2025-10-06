import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";
import "antd/dist/reset.css";
import { AuthProvider } from "./auth/AuthProvider";
import { OrgProvider } from "./org/OrgProvider";

const container = document.getElementById("root");
if (!container) {
  throw new Error('Root element with id "root" not found');
}

createRoot(container).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <OrgProvider>
          <App />
        </OrgProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
