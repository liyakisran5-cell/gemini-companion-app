import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";

// Remove the HTML pre-loader once React takes over
const removeLoader = () => {
  const loader = document.getElementById("app-loader");
  if (loader) loader.remove();
};

// Auto-recover from blank screen caused by stale service worker
const recoverFromBlankScreen = () => {
  const timeout = setTimeout(async () => {
    const root = document.getElementById("root");
    if (root && root.childElementCount === 0) {
      console.warn("[NovaMind] Blank screen detected – resetting service worker cache");
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
        window.location.reload();
      }
    }
  }, 5000); // 5s – faster recovery for blank screen
  return () => clearTimeout(timeout);
};

recoverFromBlankScreen();
removeLoader();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
