import { useState, useEffect, useRef } from "react";

const LOADING_PHASES = [
  { threshold: 10, msg: "Initialisation..." },
  { threshold: 25, msg: "Préparation de la requête..." },
  { threshold: 35, msg: "Contact du serveur..." },
  { threshold: 50, msg: "Connexion à LISE..." }, 
  { threshold: 60, msg: "Navigation dans l'interface..." }, 
  { threshold: 75, msg: "Récupération des données..." }, 
  { threshold: 90, msg: "Finalisation de l'analyse..." }, 
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
      }, 800);
      
      return () => clearTimeout(resetTimer);
    }

    setProgress(5);
    setMessage(LOADING_PHASES[0].msg);

    const updateProgress = () => {
      setProgress((prev) => {
        
        if (prev >= 95) return Math.min(prev + 0.05, 99); 
        
        // Find next phase
        const nextPhase = LOADING_PHASES.find(p => p.threshold > prev);
        
        // Update text if needed
        if (nextPhase) {
            setMessage(nextPhase.msg);
        }

        // Randomize increment for "organic" feel
        const target = nextPhase ? nextPhase.threshold : 100;
        const diff = target - prev;
        const increment = Math.max(0.2, Math.random() * (diff / 8));
        
        return prev + increment;
      });
      
      timerRef.current = setTimeout(updateProgress, 100); 
    };

    updateProgress();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLoading]);

  return { progress, message };
}