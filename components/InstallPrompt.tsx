"use client";
import { useState, useEffect } from "react";

export default function InstallPrompt() {
    
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    )

    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches);
    }, []);

    if(!isStandalone) {
        console.log("App is not installed in standalone mode");
        return null
    }

    console.log("App is installed in standalone mode");
    
    return (
        <div>
                <button 
                    className="mt-2 bg-secondary text-white px-4 py-2 rounded"
                    onClick={() => window.location.href = "https://better-lise.vercel.app"}
                >
                    Open App
                </button>
            </div>
    );
}