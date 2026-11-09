"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export default function PwaRegister() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
          console.error("Nexora service worker registration failed", error);
        });
      });
    }

    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsIos(ios && !standalone);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    const onInstalled = () => { setInstallEvent(null); setShowIosHelp(false); };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installEvent && !isIos) return null;

  const install = async () => {
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
    } else {
      setShowIosHelp((value) => !value);
    }
  };

  return (
    <aside style={{ position: "fixed", zIndex: 80, right: 14, bottom: "calc(14px + env(safe-area-inset-bottom))", maxWidth: 310, padding: "12px 14px", border: "1px solid #8bb9ca", borderRadius: 14, background: "var(--pwa-card, #ffffff)", color: "var(--pwa-text, #17253a)", boxShadow: "0 8px 28px #0002", fontSize: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <strong style={{ flex: 1 }}>Install Nexora AI</strong>
        <button type="button" onClick={install} style={{ border: 0, borderRadius: 9, padding: "8px 12px", background: "#087fa5", color: "#fff", fontWeight: 700 }}>{installEvent ? "Install" : "How to install"}</button>
        <button type="button" aria-label="Dismiss install help" onClick={() => { setInstallEvent(null); setIsIos(false); setShowIosHelp(false); }} style={{ border: 0, background: "transparent", color: "inherit", fontSize: 18 }}>×</button>
      </div>
      {showIosHelp && <p style={{ margin: "9px 0 0", lineHeight: 1.5 }}>In Safari, tap <strong>Share</strong>, then choose <strong>Add to Home Screen</strong> and confirm.</p>}
    </aside>
  );
}
