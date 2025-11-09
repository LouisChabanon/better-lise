"use client";

import { getRarity, randomGaussianGrade } from "@/lib/helper";
import { motion, useAnimation } from "framer-motion";
import { useEffect, useState, useCallback, useRef } from "react";
import confetti from "canvas-confetti";

// --- Constants ---
const ITEM_WIDTH = 120;
const REEL_SIZE = 50;
const WINNING_INDEX = 47;

// Helper function to generate a single random item
const createRandomItem = () => {
  const g = randomGaussianGrade();
  const { color } = getRarity(g);
  return { grade: g, color };
};

export default function LootCase({ grade, onComplete, onTick, onReveal }: { grade: number, onComplete?: () => void, onTick?: () => void, onReveal?: () => void }) {
  const controls = useAnimation();
  const [items, setItems] = useState<{ grade: number; color: string }[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [showWinnerGlow, setShowWinnerGlow] = useState(false);
  const lastTickIndex = useRef(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Confetti effect function
  const triggerConfetti = useCallback(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }
    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        })
      );
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        })
      );
    }, 250);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if(container) {
      setContainerWidth(container.offsetWidth);
      
      const resizeObserver = new ResizeObserver((entries) => {
        if(entries[0]){
          setContainerWidth(entries[0].contentRect.width);
        }
      });
      resizeObserver.observe(container);

      return () => resizeObserver.disconnect();
    }
  }, [])

  useEffect(() => {
    if (grade === null || grade === undefined) return;
    const generated = Array.from({ length: REEL_SIZE }, createRandomItem);
    const { color } = getRarity(grade);
    const winningItem = { grade: grade, color };
    generated[WINNING_INDEX] = winningItem;

    setItems(generated);
    setIsRolling(false);
    setShowWinnerGlow(false);
    controls.set({ x: 0 });
  }, [grade, controls]);

  useEffect(() => {
    if(items.length > 0 && containerWidth > 0 && !isRolling){
      startRoll()
    }
  }, [items, containerWidth]);

  const startRoll = async () => {
    if (isRolling || items.length === 0 || containerWidth === 0) return;

    setIsRolling(true);
    setShowWinnerGlow(false);
    lastTickIndex.current = 0;

    await controls.set({ x: 0 });

    const centerMarkX = containerWidth / 2
    const centerOffset = centerMarkX - ITEM_WIDTH / 2;
    
    const startingIndexFloat = (centerMarkX - 0) / ITEM_WIDTH;
    lastTickIndex.current = Math.floor(startingIndexFloat);

    const stopPosition = -(WINNING_INDEX * ITEM_WIDTH) + centerOffset
    const jitter = (Math.random() - 0.5) * (ITEM_WIDTH * 0.4);
    const finalX = stopPosition + jitter;

    await controls.start({
      x: finalX,
      transition: { 
        duration: 8,
        ease: [0, 0.65, 0.45, 1],
       },
    });

    if(onReveal){
      onReveal();
    }

    setIsRolling(false);
    setShowWinnerGlow(true);
    if(grade >=10){
      triggerConfetti();
    }

    if(onComplete){
      setTimeout(() => {
        onComplete();
      }, 3000)
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={containerRef} className={`relative w-[90vw] md:w-[600px] h-[120px] md:h[160px] overflow-hidden border-4 border-backgroundTertiary dark:border-backgroundTertiary rounded-xl bg-backgroundSecondary
                      before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1/4 before:z-20 before:pointer-events-none before:bg-gradient-to-r before:from-backgroundSecondary before:to-transparent
                      after:content-[''] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-1/4 after:z-20 after:pointer-events-none after:bg-gradient-to-l after:from-backgroundSecondary after:to-transparent`}>
        
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[2px] bg-backgroundPrimary pointer-events-none z-10" />

        <motion.div
          className="flex h-full"
          animate={controls}
          initial={{ x: 0 }}
          onUpdate={(latest) => {
            
            const tickerMarkX = containerWidth / 2;
            const currentX = parseFloat(String(latest.x));
            const currentIndexFloat = (tickerMarkX - currentX) / ITEM_WIDTH;
            const currentIndex = Math.floor(currentIndexFloat);

            if (currentIndex > lastTickIndex.current) {
              lastTickIndex.current = currentIndex;
              if(onTick){
                onTick();
              }
            }
          }}
        >
          {items.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-center text-white flex-shrink-0 relative ${
                showWinnerGlow && idx === WINNING_INDEX
                  ? "winner-glow"
                  : ""
              }`}
              style={{
                width: ITEM_WIDTH,
                height: "100%",
                background: item.color,
                borderRight: "2px solid backgroundSecondary",
                boxShadow: idx === WINNING_INDEX && showWinnerGlow ? `0 0 18px 6px ${item.color}, inset 0 0 10px 4px white` : "inset 0 0 6px rgba(0,0,0,.4)"
              }}
            >
              <span className="text-3xl font-extrabold drop-shadow-md">
                {item.grade.toFixed(2)}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      <style jsx>{`
        .text-stroke {
          text-shadow: -1px -1px 0 var(--color-on-primary),
            1px -1px 0 var(--color-on-primary),
            -1px 1px 0 var(--color-on-primary),
            1px 1px 0 var(--color-on-primary);
        }

        .winner-glow {
          box-shadow: 0 0 15px 5px ${items[WINNING_INDEX]?.color ||
          "yellow"}, inset 0 0 10px 3px rgba(255, 255, 255, 0.7);
          
          /* --- PULSE-GLOW ANIMATION REMOVED --- */
          animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes pop-in {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}