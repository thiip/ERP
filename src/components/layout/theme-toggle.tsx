"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
      title={theme === "dark" ? "Modo claro" : "Modo escuro"}
    >
      <div className="theme-toggle-knob">
        {theme === "dark" ? (
          <Moon className="h-3 w-3 text-green-300" />
        ) : (
          <Sun className="h-3 w-3 text-yellow-500" />
        )}
      </div>
    </button>
  );
}
