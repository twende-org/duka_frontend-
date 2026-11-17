import { registerSW } from "virtual:pwa-register";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// A deploy replaces hashed chunks; a tab still running the old bundle then
// fails to lazy-load its next page. One reload lands on the new bundle.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const key = "biashara.lastPreloadReload";
  const last = Number(sessionStorage.getItem(key) || 0);
  if (Date.now() - last > 15_000) {
    sessionStorage.setItem(key, String(Date.now()));
    window.location.reload();
  }
});

// Guard: never register service workers in Lovable preview iframe
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
} else {
  // Explicitly register service worker for production
  registerSW({
    onNeedRefresh() {
      if (confirm("New content available. Reload?")) {
        window.location.reload();
      }
    },
    onOfflineReady() {
      console.log("PWA ready for offline use");
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
