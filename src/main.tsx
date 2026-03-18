import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
  }, 12000); // 12s – enough time for normal auth + render
  return () => clearTimeout(timeout);
};

recoverFromBlankScreen();

createRoot(document.getElementById("root")!).render(<App />);
