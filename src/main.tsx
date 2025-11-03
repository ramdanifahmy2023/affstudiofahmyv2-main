// src/main.tsx

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./components/ThemeProvider"; // <-- 1. IMPORT BARU

createRoot(document.getElementById("root")!).render(
  // --- 2. TAMBAHKAN WRAPPER DI SINI ---
  <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
    <App />
  </ThemeProvider>
  // ----------------------------------
);