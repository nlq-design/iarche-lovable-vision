import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { captureUtmFromUrl } from "./lib/utm";

// Capture UTM parameters on first hit (persists in sessionStorage for lead attribution)
captureUtmFromUrl();

// Safari/WebKit compatibility: Polyfill for smooth scroll behavior
if (!('scrollBehavior' in document.documentElement.style)) {
  // Fallback for Safari < 15.4
  (document.documentElement.style as CSSStyleDeclaration).scrollBehavior = 'auto';
}

// Safari ITP workaround: Force localStorage availability check
try {
  const testKey = '__safari_storage_test__';
  localStorage.setItem(testKey, testKey);
  localStorage.removeItem(testKey);
} catch (e) {
  console.warn('localStorage not available (Safari Private Mode or ITP)');
}

// Safari iOS viewport height fix
const setVH = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};
setVH();
window.addEventListener('resize', setVH);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
