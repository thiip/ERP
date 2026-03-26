"use client";

import { useTransition } from "react";
import { toggleAutomation } from "@/actions/admin";
import { Power } from "lucide-react";

interface ToggleAutomationProps {
  id: string;
  isActive: boolean;
}

export function ToggleAutomation({ id, isActive }: ToggleAutomationProps) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleAutomation(id, !isActive);
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      title={isActive ? "Desativar automacao" : "Ativar automacao"}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 ${
        isActive ? "bg-emerald-600" : "bg-foreground/10"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full glass-card ring-0 transition duration-200 ease-in-out ${
          isActive ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
