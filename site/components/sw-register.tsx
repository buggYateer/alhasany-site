"use client";

import { useEffect } from "react";

/** Registers the service worker in production (offline support + installable app). */
export function ServiceWorker() {
  useEffect(() => {
    // Old links looked like /#/s/...: move them to the real path.
    if (location.hash.startsWith("#/")) location.replace(location.hash.slice(1) || "/");
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
