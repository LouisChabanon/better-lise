"use client";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "./Button";

export default function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
        <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="relative flex h-8 w-16 items-center rounded-full bg-backgroundTertiary transition-colors border-1 border-primary-400"
    >
      {/* Sun / Moon icons */}
      <span className="absolute right-1 text-yellow-500 text-sm">☀️</span>
      <span className="absolute left-1 text-gray-200 text-sm">🌙</span>

      {/* Knob */}
      <span
        className={`absolute h-7 w-7 rounded-full bg-buttonPrimaryBackground shadow-md transform transition-transform duration-300 ${
          resolvedTheme === "dark" ? "translate-x-8" : "translate-x-0"
        }`}
      />
    </button>
  )
}