// components/InstallAppBanner.tsx
"use client";

import { useEffect, useState } from "react";
import useInstallPrompt from "@/hooks/useInstallPrompt";

export default function InstallAppBanner() {
  const { deferredPrompt, isInstallable } = useInstallPrompt();
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = () => setInstalled(true);
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    (deferredPrompt as any).prompt();
    const result = await (deferredPrompt as any).userChoice;


  if (!isInstallable || installed) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 bg-white shadow-lg rounded-xl p-4 flex justify-between items-center z-50">
      <span className="text-sm">Install Better Lise on your device</span>
      <button
        onClick={handleInstall}
        className="bg-primary text-white rounded-md px-3 py-1 text-sm"
      >
        Install
      </button>
    </div>
  );
}}
