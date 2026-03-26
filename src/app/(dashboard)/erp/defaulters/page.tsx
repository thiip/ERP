"use client";

import { useEffect, useState, useTransition } from "react";
import { getDefaulters } from "@/actions/financial";
import { Search, ChevronDown, ChevronRight, ArrowLeftRight, Settings, AlertTriangle } from "lucide-react";
import Link from "next/link";

type DefaulterInvoice = {
  id: string;
  notes: string | null;
  dueDate: string;
  totalValue: unknown;
};

type DefaulterGroup = {
  clientName: string;
  total: number;
  invoices: DefaulterInvoice[];
};

type DefaultersData = {
  overdue: DefaulterGroup[];
  inProgress: DefaulterGroup[];
  resolved: DefaulterGroup[];
};

export default function DefaultersPage() {
  const [data, setData] = useState<DefaultersData>({ overdue: [], inProgress: [], resolved: [] });
  const [activeTab, setActiveTab] = useState<"overdue" | "inProgress" | "resolved">("overdue");
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    startTransition(async () => {
      const result = await getDefaulters();
      setData(result as unknown as DefaultersData);
    });
  }

  const fmt = (v: unknown) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));

  const toggleGroup = (clientName: string) => {
    const next = new Set(expandedGroups);
    if (next.has(clientName)) next.delete(clientName);
    else next.add(clientName);
    setExpandedGroups(next);
  };

  const currentGroups = data[activeTab] ?? [];
  const filtered = currentGroups.filter((group) => {
    if (!search) return true;
    return group.clientName.toLowerCase().includes(search.toLowerCase());
  });

  const totalAmount = filtered.reduce((sum, g) => sum + g.total, 0);

  const tabs = [
    { key: "overdue" as const, label: "Atrasadas", count: data.overdue?.length ?? 0 },
    { key: "inProgress" as const, label: "Em andamento", count: data.inProgress?.length ?? 0 },
    { key: "resolved" as const, label: "Resolvidas", count: data.resolved?.length ?? 0 },
  ];

  return (
    <div>
      {/* Top buttons */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/erp/transactions"
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <ArrowLeftRight className="h-4 w-4" />
          Extrato
        </Link>
        <button className="flex items-center gap-2 rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03]">
          <Settings className="h-4 w-4" /> Configurar cobranças
        </button>
      </div>

      {/* Tabs + Total */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 rounded-lg border border-foreground/[0.08] bg-foreground/[0.03] p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setExpandedGroups(new Set()); }}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "glass-pill-active text-foreground"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${
                activeTab === tab.key
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-foreground/10 text-foreground/60"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="text-right">
          <span className="text-xs text-foreground/50 block">Total (R$)</span>
          <span className="text-lg font-bold text-red-600">{fmt(totalAmount)}</span>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por cliente..."
            className="w-full rounded-lg border border-foreground/10 pl-9 pr-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-3">
        {isPending && (
          <div className="text-center py-12 text-foreground/50">Carregando...</div>
        )}
        {!isPending && filtered.length === 0 && (
          <div className="rounded-xl glass-card px-4 py-12 text-center text-foreground/50">
            Nenhum resultado encontrado
          </div>
        )}
        {!isPending && filtered.map((group) => {
          const isExpanded = expandedGroups.has(group.clientName);
          return (
            <div key={group.clientName} className="rounded-xl glass-card-elevated overflow-hidden">
              {/* Group header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-foreground/[0.02] transition-colors"
                onClick={() => toggleGroup(group.clientName)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-foreground/40" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-foreground/40" />
                  )}
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-foreground">{group.clientName}</span>
                  <span className="text-xs text-foreground/50">({group.invoices.length} {group.invoices.length === 1 ? "título" : "títulos"})</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-red-600">{fmt(group.total)}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); }}
                    className="text-xs text-emerald-600 hover:text-emerald-800 font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 border border-emerald-500/20"
                  >
                    Renegociar
                  </button>
                </div>
              </div>

              {/* Expanded invoices */}
              {isExpanded && (
                <div className="border-t border-foreground/[0.04]">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-foreground/[0.02]">
                        <th className="px-4 py-2 text-left text-xs font-medium text-foreground/50 uppercase">Descrição</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-foreground/50 uppercase">Vencimento</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-foreground/50 uppercase">Valor (R$)</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-foreground/50 uppercase">Histórico</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/[0.04]">
                      {group.invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-foreground/[0.02] transition-colors">
                          <td className="px-4 py-2.5 text-sm text-foreground/60">
                            {inv.notes || "-"}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-foreground">
                            {new Date(inv.dueDate).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-2.5 text-sm font-medium text-right text-red-600">
                            {fmt(inv.totalValue)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">
                              Ver histórico
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
