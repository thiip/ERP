"use client";

import { useTransition, useState } from "react";
import { deleteAutomation } from "@/actions/admin";
import { Trash2 } from "lucide-react";

interface DeleteAutomationProps {
  id: string;
  name: string;
}

export function DeleteAutomation({ id, name }: DeleteAutomationProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteAutomation(id);
      setShowConfirm(false);
    });
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600">Excluir?</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? "..." : "Sim"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isPending}
          className="rounded bg-foreground/10 px-2 py-1 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/20 disabled:opacity-50"
        >
          Nao
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      title="Excluir automacao"
      className="rounded-lg p-2 text-foreground/40 transition-colors hover:bg-red-500/10 hover:text-red-600"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
