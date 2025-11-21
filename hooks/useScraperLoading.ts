import { useState, useEffect, useRef } from "react";

const LOADING_PHASES = [
  { threshold: 30, ms: 500, msg: "Initialisation..." },     // Fast
  { threshold: 60, ms: 1500, msg: "Connexion à LISE..." },  // Medium
  { threshold: 80, ms: 3000, msg: "Récupération des notes..." }, // Slowing down
  { threshold: 90, ms: 5000, msg: "Analyse des données..." }, // Crawling
];

export function useScraperLoading(isLoading: boolean) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      setMessage("Terminé !");
      
      const resetTimer = setTimeout(() => {
        setProgress(0);
        setMessage("");
      }, 800); // Wait a bit before hiding so user sees the 100%
      
      return () => clearTimeout(resetTimer);
    }

    setProgress(5); // Start at 5% immediately for feedback
    setMessage(LOADING_PHASES[0].msg);

    const updateProgress = () => {
      setProgress((prev) => {
        // If we are already high, increment by tiny amounts (asymptotic)
        if (prev >= 90) return Math.min(prev + 0.1, 95); 
        
        // Find current phase
        const phase = LOADING_PHASES.find(p => prev < p.threshold) || LOADING_PHASES[LOADING_PHASES.length - 1];
        
        // Update text if needed
        if(prev > phase.threshold - 10) setMessage(phase.msg);

        // Randomize increment for "organic" feel
        const diff = phase.threshold - prev;
        const increment = Math.max(0.5, Math.random() * (diff / 10));
        
        return prev + increment;
      });
      
      // The closer we get to 100, the slower the tick rate
      timerRef.current = setTimeout(updateProgress, 150); 
    };

    updateProgress();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLoading]);

  return { progress, message };
}