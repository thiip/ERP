"use client";

import { useEffect, useState, useTransition } from "react";
import { getDDABoletos, getDDASummary, registerExpenseFromBoleto, hideBoleto, unhideBoleto } from "@/actions/financial";
import type { BoletoStatus } from "@/generated/prisma/client";
import { ChevronLeft, ChevronRight, Search, ChevronDown } from "lucide-react";

type DDABoleto = {
  id: string;
  supplierName: string;
  supplierCnpj: string;
  issueDate: string;
  dueDate: string;
  value: unknown;
  status: string;
};

type DDASummary = {
  aVencer: number;
  vencidos: number;
  totalCount: number;
};

type TabKey = "found" | "linked" | "hidden";

const tabStatusMap: Record<TabKey, string> = {
  found: "PENDING",
  linked: "LINKED",
  hidden: "HIDDEN",
};

export default function DDAPage() {
  const [boletos, setBoletos] = useState<DDABoleto[]>([]);
  const [summary, setSummary] = useState<DDASummary>({ aVencer: 0, vencidos: 0, totalCount: 0 });
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabKey>("found");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  useEffect(() => {
    loadData();
  }, [month, year, activeTab]);

  async function loadData() {
    const status = tabStatusMap[activeTab];
    const [bols, sum] = await Promise.all([
      getDDABoletos(month, year, status as BoletoStatus),
      getDDASummary(month, year),
    ]);
    setBoletos(bols as unknown as DDABoleto[]);
    setSummary(sum as DDASummary);
    setSelected(new Set());
    setOpenDropdown(null);
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  }

  async function handleRegisterExpense(id: string) {
    startTransition(async () => {
      await registerExpenseFromBoleto(id);
      loadData();
    });
  }

  async function handleHide(id: string) {
    startTransition(async () => {
      await hideBoleto(id);
      loadData();
    });
  }

  async function handleUnhide(id: string) {
    startTransition(async () => {
      await unhideBoleto(id);
      loadData();
    });
  }

  const fmt = (v: unknown) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));

  const filtered = boletos.filter((b) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      b.supplierName.toLowerCase().includes(s) ||
      b.supplierCnpj.toLowerCase().includes(s)
    );
  });

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "found", label: "Boletos encontrados", count: summary.totalCount },
    { key: "linked", label: "Boletos vinculados" },
    { key: "hidden", label: "Boletos ocultos" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10">
          Desativar DDA
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-foreground/[0.08] mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSearch(""); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-foreground/50 hover:text-foreground/70"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-xs font-medium">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div>
          <span className="text-xs text-foreground/50 block mb-1">Vencimento</span>
          <div className="flex items-center gap-2 rounded-lg border border-foreground/10 px-3 py-1.5">
            <button onClick={prevMonth} className="text-foreground/50 hover:text-foreground/70"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-medium min-w-[140px] text-center">{monthNames[month - 1]} de {year}</span>
            <button onClick={nextMonth} className="text-foreground/50 hover:text-foreground/70"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="flex-1">
          <span className="text-xs text-foreground/50 block mb-1">Pesquisar</span>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              className="w-full rounded-lg border border-foreground/10 pl-9 pr-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-0 rounded-xl glass-card mb-4 overflow-hidden">
        <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
          <div className="text-xs text-foreground/50">A vencer</div>
          <div className="text-lg font-bold text-emerald-600">{summary.aVencer}</div>
        </div>
        <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
          <div className="text-xs text-foreground/50">Vencidos</div>
          <div className="text-lg font-bold text-red-600">{summary.vencidos}</div>
        </div>
        <div className="px-4 py-3 text-center bg-emerald-500/10">
          <div className="text-xs text-foreground/50">Todos</div>
          <div className="text-lg font-bold text-emerald-400">{summary.totalCount}</div>
        </div>
      </div>

      {/* Batch actions */}
      <div className="flex items-center gap-3 mb-2 text-sm text-foreground/50">
        <span>{selected.size} registro(s) selecionado(s)</span>
        {selected.size > 0 && (
          <>
            <button className="text-emerald-600 hover:text-emerald-800 font-medium">Cadastrar despesa</button>
            <button className="text-emerald-600 hover:text-emerald-800 font-medium">Ocultar boletos</button>
          </>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl glass-card-elevated overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) setSelected(new Set(filtered.map((b) => b.id)));
                    else setSelected(new Set());
                  }}
                  className="rounded border-foreground/10"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Fornecedor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">CNPJ</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Data de emissão</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Vencimento</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Valor (R$)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/[0.04]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-foreground/50">
                  Nenhum resultado encontrado
                </td>
              </tr>
            )}
            {filtered.map((boleto) => (
              <tr key={boleto.id} className="hover:bg-foreground/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(boleto.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(boleto.id);
                      else next.delete(boleto.id);
                      setSelected(next);
                    }}
                    className="rounded border-foreground/10"
                  />
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  {boleto.supplierName}
                </td>
                <td className="px-4 py-3 text-sm text-foreground/60">
                  {boleto.supplierCnpj}
                </td>
                <td className="px-4 py-3 text-sm">
                  {new Date(boleto.issueDate).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-sm">
                  {new Date(boleto.dueDate).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-right">
                  {fmt(boleto.value)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="relative inline-block">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === boleto.id ? null : boleto.id)}
                      disabled={isPending}
                      className="flex items-center gap-1 text-xs text-foreground/60 hover:text-foreground/90 font-medium px-2 py-1 rounded hover:bg-foreground/[0.04]"
                    >
                      Ações
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {openDropdown === boleto.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 rounded-lg glass-card shadow-lg z-10">
                        {activeTab === "hidden" ? (
                          <button
                            onClick={() => { handleUnhide(boleto.id); setOpenDropdown(null); }}
                            className="w-full text-left px-3 py-2 text-sm text-foreground/70 hover:bg-foreground/[0.03] rounded-lg"
                          >
                            Reexibir boleto
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => { handleRegisterExpense(boleto.id); setOpenDropdown(null); }}
                              className="w-full text-left px-3 py-2 text-sm text-foreground/70 hover:bg-foreground/[0.03] rounded-t-lg"
                            >
                              Cadastrar como despesa
                            </button>
                            <button
                              onClick={() => { handleHide(boleto.id); setOpenDropdown(null); }}
                              className="w-full text-left px-3 py-2 text-sm text-foreground/70 hover:bg-foreground/[0.03] rounded-b-lg"
                            >
                              Ocultar
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
