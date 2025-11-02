"use client";

import { useEffect, useState } from "react";
import {Button} from "./Button";
import DarkModeToggle from "./DarkModeToggle";
import { tbk } from "@/lib/types";
import posthog from "posthog-js";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}



const TBK_OPTIONS: tbk[] = [
    "Sibers",
    "Chalons",
    "Boquette",
    "Cluny",
    "Birse",
    "P3",
    "KIN",
    "Bordels",
];

export default function SettingsDialog({ isOpen, onClose, onSave }: SettingsDialogProps) {

    const [username, setUsername] = useState<string | null>(localStorage.getItem("lise_id") || "");
    const [tbkValue, setTbkValue] = useState<tbk>(localStorage.getItem("tbk") as tbk || "Sibers");
    const [isOptedOut, setIsOptedOut] = useState(false);

    if(!isOpen) return null;

    useEffect(() => {
      if(posthog){
        setIsOptedOut(posthog.has_opted_out_capturing());
      }
    }, [posthog])

    const handleToggle = () => {
      if (isOptedOut){
        setIsOptedOut(false);
      }else{
        setIsOptedOut(true);
      }
    }

    return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => onClose()}
        aria-hidden="true"
      />

      {/* modal panel */}
      <div className="relative bg-backgroundPrimary rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg text-textPrimary font-semibold">Paramètres</h2>
          <Button
            status="secondary"
            onClick={() => onClose()}
            aria-label="Fermer les paramètres"
          >
            ✕
          </Button>
        </div>

        {/* body */}
        <div className="flex items-center gap-4 mb-2 pb-2">
            <label
              htmlFor="settings-lise-input"
              className="w-36 font-medium text-textSecondary"
            >
              Identifiant :
            </label>

            <div className="flex-1">
              <div className="flex items-center px-3 py-2 bg-backgroundSecondary rounded-lg focus-within:ring-1 focus-within:ring-primary-400 hover:ring-1 hover:ring-primary-400">
                <input
                  id="settings-lise-input"
                  type="text"
                  className="w-full bg-transparent focus:outline-none"
                  placeholder="Identifiant Lise"
                  defaultValue={localStorage.getItem("lise_id") || ""}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
        </div>
        <div className="flex items-center gap-4 mb-2 pb-2">
            <label
              htmlFor="settings-tbk-input"
              className="w-36 font-medium text-textSecondary"
            >
              Tabagn'ss :
            </label>
            <div className="flex-1">
                <div className="flex">
                    <select
                        className="w-full rounded-lg border bg-backgroundSecondary px-3 py-2 border-primary-400 focus-within:ring-1 focus-within:ring-primary-400 hover:ring-1 hover:ring-primary-400"
                        value={tbkValue}
                        onChange={(e) => setTbkValue(e.target.value as tbk)}>
                    {TBK_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                    </select>
                </div>
            </div>
        </div>

          {/* Dark mode / other toggles row */}
          <div className="flex items-center justify-between gap-4 pb-2">
              <span className="font-medium text-textSecondary">Thème :</span>
              <DarkModeToggle />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium text-texSecondary">Envoyer des statistiques anonymes :</span>
            <button
              onClick={handleToggle}
              className="relative flex h-8 w-16 items-center rounded-full bg-backgroundTertiary transition-colors border-1 border-primary-400"
            >
              {/* Knob */}
              <span
                className={`absolute h-7 w-7 rounded-full bg-buttonPrimaryBackground shadow-md transform transition-transform duration-300 ${ isOptedOut
                  ? "translate-x-8" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* actions */}
          <div className="flex justify-end gap-3 mt-8">
            <Button status="secondary" onClick={() => onClose()} type="button">
              Annuler
            </Button>
            <Button status="primary" type="submit" onClick={() => {
                if (username){
                    localStorage.setItem("lise_id", username);
                }
                if(tbkValue !== localStorage.getItem("tbk") || localStorage.getItem("tbk") == null){
                  if(posthog.has_opted_in_capturing()){
                    posthog.capture("select_tbk_event", {tbk: tbkValue, username: username})
                  }
                }
                localStorage.setItem("tbk", tbkValue);
                
                isOptedOut ? posthog.opt_out_capturing() : posthog.opt_in_capturing()

                onSave();
            }}>
              Sauvegarder
            </Button>
          </div>
      </div>
    </div>
    
    )
}

