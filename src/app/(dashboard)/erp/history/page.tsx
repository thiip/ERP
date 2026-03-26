"use client";

import { useEffect, useState, useTransition } from "react";
import { getFinancialHistory } from "@/actions/financial";
import { Plus, ChevronDown, Search } from "lucide-react";

type HistoryEntry = {
  id: string;
  dateTime: string;
  user: string;
  action: string;
  type: string;
  description: string;
};

const actionTypes = [
  { value: "", label: "Todos os tipos" },
  { value: "CREATE", label: "Criação" },
  { value: "UPDATE", label: "Alteração" },
  { value: "DELETE", label: "Exclusão" },
  { value: "PAYMENT", label: "Pagamento" },
  { value: "CANCEL", label: "Cancelamento" },
];

const actionLabels: Record<string, string> = {
  CREATE: "Criação",
  UPDATE: "Alteração",
  DELETE: "Exclusão",
  PAYMENT: "Pagamento",
  CANCEL: "Cancelamento",
};

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-400",
  UPDATE: "bg-emerald-500/10 text-emerald-400",
  DELETE: "bg-red-500/10 text-red-400",
  PAYMENT: "bg-emerald-500/10 text-emerald-400",
  CANCEL: "bg-foreground/[0.04] text-foreground/70",
};

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [actionFilter, setActionFilter] = useState("");
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadData();
  }, [actionFilter]);

  async function loadData() {
    startTransition(async () => {
      const result = await getFinancialHistory();
      setEntries(result as unknown as HistoryEntry[]);
    });
  }

  return (
    <div>
      {/* Top buttons */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <button
            onClick={() => setShowNewMenu(!showNewMenu)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo registro
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {showNewMenu && (
            <div className="absolute top-full left-0 mt-1 w-48 rounded-lg glass-card shadow-lg z-10">
              <button className="w-full text-left px-4 py-2.5 text-sm text-foreground/70 hover:bg-foreground/[0.03] rounded-t-lg">
                Registro manual
              </button>
              <button className="w-full text-left px-4 py-2.5 text-sm text-foreground/70 hover:bg-foreground/[0.03] rounded-b-lg">
                Importar registros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-emerald-100 bg-emerald-500/10 px-4 py-3 mb-4">
        <p className="text-sm text-emerald-800">
          Consulte o histórico financeiro e veja quem fez cada ação nos últimos 90 dias
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-4">
        <div>
          <span className="text-xs text-foreground/50 block mb-1">Filtrar por tipo de ação</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            {actionTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl glass-card-elevated overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Data/Hora</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Usuário</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Ação</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Descrição</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/[0.04]">
            {isPending && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-foreground/50">
                  Carregando...
                </td>
              </tr>
            )}
            {!isPending && entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-foreground/50">
                  Nenhum resultado encontrado
                </td>
              </tr>
            )}
            {!isPending && entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-foreground/[0.02] transition-colors">
                <td className="px-4 py-3 text-sm text-foreground">
                  {new Date(entry.dateTime).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  {entry.user}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${actionColors[entry.action] || "bg-foreground/[0.04] text-foreground/70"}`}>
                    {actionLabels[entry.action] || entry.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-foreground/60">
                  {entry.type}
                </td>
                <td className="px-4 py-3 text-sm text-foreground/60">
                  {entry.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
