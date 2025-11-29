"use client";

import React, { useEffect, useState } from "react";
import { GradeType } from "@/lib/types";
import { Button } from "./Button";
import useSound from "use-sound";
import LootCase from "../LootCase";
import { getRarity } from "@/lib/utils/game-utils";

interface GradeModalProps {
  grade: GradeType;
  onClose?: () => void;
  onComplete?: () => void; // <-- Added onComplete prop
}

export default function GradeLootBoxModal({
  grade,
  onClose,
  onComplete,
}: GradeModalProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  // --- Sound hooks ---
  const [playTick] = useSound("/sounds/crate_item_scroll.wav", {
    volume: 0.2,
    interrupt: false,
  });
  const [playReveal] = useSound("/sounds/item_reveal3_rare.wav", {
    volume: 0.3,
  });
  const [playRollStart] = useSound("/sounds/crate_open.wav", { volume: 0.3 });

  useEffect(() => {
    let mounted = true;
    return () => {
      mounted = false;
    };
  }, [grade.code]);

  const handleOpenClick = () => {
    if (playRollStart) {
      playRollStart();
    }
    setIsOpening(true);
  };

  const handleReveal = () => {
    if(playReveal) playReveal();
    setIsRevealed(true);
  }

  const { color } = getRarity(Number(grade.note))

  const dynamicGlowStyle = {
    "--glow-color": color,
  } as React.CSSProperties;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center items-start sm:items-center overflow-y-auto bg-black/40 backdrop-blur-sm p-4`}
      onClick={onClose}
    >
      <div
        className={`bg-backgroundPrimary p-4 sm:p-6 rounded-lg w-full max-w-lg lg:max-w-4xl transition-all duration-300 ${isRevealed ? "modal-neon-glow" : ""}`}
        style={isRevealed ? dynamicGlowStyle : {}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 sm:mb-6 gap-4">
          <div className="flex flex-col min-w-0">
            <h3 className="text-lg font-semibold text-textPrimary truncate">
              Révéler - {grade.libelle}
            </h3>
            <p className="text-sm text-textTertiary break-words">{grade.code}</p>
          </div>
          <Button onClick={() => onClose && onClose()} status="secondary">
            ✕
          </Button>
        </div>
        <div className="lg:flex lg:flex-row lg:gap-8 justify-center">

          {isOpening ? (
            <LootCase
              grade={grade.note}
              onTick={playTick}
              onReveal={handleReveal}
              onComplete={onComplete} 
            />
          ) : (
            <div className="flex flex-col items-center gap-4 w-full">

              <div className="relative w-full max-w-[600px] h-[160px] overflow-hidden border-4 border-backgroundTertiary rounded-xl bg-backgroundSecondary flex items-center justify-center">
                <span className="text-6xl text-textTertiary animate-pulse">
                  🎁
                </span>
                <p className="absolute bottom-4 text-textTertiary font-semibold">
                  Prêt à révéler ?
                </p>
              </div>

              <Button
                onClick={handleOpenClick}
                status="primary"
                className="w-full max-w-xs"
              >
                Voir la note
              </Button>
            </div>
          )}
        </div>
      </div>
        <style jsx global>{`
            .modal-neon-glow {
              /* Initial soft glow */
              box-shadow: 0 0 5px var(--glow-color),
                          0 0 10px var(--glow-color);
              animation: neon-pulse 0.5s infinite alternate; /* New animation for neon effect */
            }

            @keyframes neon-pulse {
              from {
                box-shadow: 0 0 5px var(--glow-color),
                            0 0 20px var(--glow-color),
                            0 0 30px var(--glow-color),
                            0 0 40px var(--glow-color),
                            0 0 50px var(--glow-color);
              }
              to {
                box-shadow: 0 0 10px var(--glow-color),
                            0 0 30px var(--glow-color),
                            0 0 40px var(--glow-color),
                            0 0 50px var(--glow-color),
                            0 0 60px var(--glow-color),
                            0 0 70px var(--glow-color);
              }
            }
          `}</style>
    </div>

  );
}