import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
// Self-hosted Plus Jakarta Sans (same weights the Google CDN served) — no
// third-party font requests, works offline, and lets the CSP stay same-origin.
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "@fontsource/plus-jakarta-sans/500-italic.css";
import "@fontsource/plus-jakarta-sans/600-italic.css";
import "@fontsource/plus-jakarta-sans/700-italic.css";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./components/AuthProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";

registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary scope="app">
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
