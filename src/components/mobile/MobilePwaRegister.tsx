"use client";

import { useEffect } from "react";

function canRegisterServiceWorker() {
  if (!("serviceWorker" in navigator)) return false;
  if (window.location.protocol === "https:") return true;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

export default function MobilePwaRegister() {
  useEffect(() => {
    if (!canRegisterServiceWorker()) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return null;
}
