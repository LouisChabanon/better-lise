"use client";
import { useEffect, useState } from "react";
import { Button } from "./ui/Button";

export default function InstallAppBanner() {

  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

  }, [])

  if (isStandalone) {
    console.log("App is already installed");
    return;
  }

  const handleInstall = () => {
    // Prompt the user to install the app
    alert("To install this app, tap the Share button and then 'Add to Home Screen'.");
    setIsIOS(false); // Hide the banner after prompting
  }

  return (
    <>
      {isIOS && ( 
        <div className="fixed bottom-4 inset-x-4 bg-backgroundSecondary shadow-lg rounded-xl p-4 flex justify-between items-center z-50">
          <span className="text-sm text-">Install Better Lise on your device</span>
          <Button
            onClick={handleInstall}
            
          >
            Install
          </Button>
        </div>
      )}
    </>
  );
}
