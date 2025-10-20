"use client";

import { useState } from "react";
import {Button} from "./Button";
import DarkModeToggle from "./DarkModeToggle";
import { tbk } from "@/lib/types";

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

    if(!isOpen) return null;

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
        <div className="flex items-center gap-4 mb-2">
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
        <div className="flex items-center gap-4 mb-2">
            <label
              htmlFor="settings-tbk-input"
              className="w-36 font-medium text-textSecondary"
            >
              Tabagn'ss :
            </label>
            <div className="flex-1">
                <div className="flex">
                    <select
                        className="w-full rounded-lg border bg-backgroundSecondary px-3 py-2 focus-within:ring-1 focus-within:ring-primary-400 hover:ring-1 hover:ring-primary-400"
                        value={tbkValue}
                        onChange={(e) => setTbkValue(e.target.value as tbk)}
                    >
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
          <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-textSecondary">Thème :</span>
              <DarkModeToggle />
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
                localStorage.setItem("tbk", tbkValue);
                onSave();
            }}>
              Sauvegarder
            </Button>
          </div>
      </div>
    </div>
    
    )
}

