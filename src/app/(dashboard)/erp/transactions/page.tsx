"use client";

import { useEffect, useState } from "react";
import { getTransactionStatement, getStatementSummary } from "@/actions/financial";
import { Plus, Download, Printer, Upload, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";

type Transaction = {
  id: string;
  date: string;
  description: string;
  type: "RECEIVABLE" | "PAYABLE" | "EXPENSE";
  status: string;
  value: number;
  balance: number;
};

type Summary = {
  receitasEmAberto: number;
  receitasRealizadas: number;
  despesasEmAberto: number;
  despesasRealizadas: number;
  total: number;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({ receitasEmAberto: 0, receitasRealizadas: 0, despesasEmAberto: 0, despesasRealizadas: 0, total: 0 });
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  useEffect(() => { loadData(); }, [month, year]);

  async function loadData() {
    const [tx, sum] = await Promise.all([
      getTransactionStatement(month, year),
      getStatementSummary(month, year),
    ]);
    // Add running balance to entries
    const entries = tx as unknown as Transaction[];
    let runningBalance = 0;
    for (const entry of entries) {
      if (entry.type === "RECEIVABLE") {
        runningBalance += Number(entry.value);
      } else {
        runningBalance -= Number(entry.value);
      }
      entry.balance = runningBalance;
    }
    setTransactions(entries);
    setSummary(sum as Summary);
  }

  function prevMonth() { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); }

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const filtered = transactions.filter((t) => {
    if (!search) return true;
    return t.description.toLowerCase().includes(search.toLowerCase());
  });

  const statusLabels: Record<string, string> = { DRAFT: "Rascunho", ISSUED: "Em aberto", PAID: "Pago", OVERDUE: "Vencido" };
  const statusColors: Record<string, string> = { DRAFT: "text-foreground/50", ISSUED: "text-emerald-600", PAID: "text-green-600", OVERDUE: "text-red-600" };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus className="h-4 w-4" /> Nova
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03]">
          <Download className="h-4 w-4" /> Exportar
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03]">
          <Printer className="h-4 w-4" /> Imprimir
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03]">
          <Upload className="h-4 w-4" /> Importar planilha
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div>
          <span className="text-xs text-foreground/50 block mb-1">Período</span>
          <div className="flex items-center gap-2 rounded-lg border border-foreground/10 px-3 py-1.5">
            <button onClick={prevMonth}><ChevronLeft className="h-4 w-4 text-foreground/50" /></button>
            <span className="text-sm font-medium min-w-[140px] text-center">{monthNames[month - 1]} de {year}</span>
            <button onClick={nextMonth}><ChevronRight className="h-4 w-4 text-foreground/50" /></button>
          </div>
        </div>
        <div className="flex-1">
          <span className="text-xs text-foreground/50 block mb-1">Pesquisar</span>
          <div className="relative">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar..." className="w-full rounded-lg border border-foreground/10 pl-9 pr-3 py-1.5 text-sm" />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
          </div>
        </div>
        <div>
          <span className="text-xs text-foreground/50 block mb-1">&nbsp;</span>
          <button className="flex items-center gap-2 rounded-lg border border-foreground/10 px-3 py-1.5 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03]">
            <Filter className="h-4 w-4" /> Mais filtros
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-0 rounded-xl glass-card mb-4 overflow-hidden">
        <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
          <div className="text-xs text-foreground/50">Receitas em aberto (R$)</div>
          <div className="text-lg font-bold text-emerald-600">{fmt(summary.receitasEmAberto)}</div>
        </div>
        <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
          <div className="text-xs text-foreground/50">Receitas realizadas (R$)</div>
          <div className="text-lg font-bold text-green-600">{fmt(summary.receitasRealizadas)}</div>
        </div>
        <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
          <div className="text-xs text-foreground/50">Despesas em aberto (R$)</div>
          <div className="text-lg font-bold text-orange-600">{fmt(summary.despesasEmAberto)}</div>
        </div>
        <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
          <div className="text-xs text-foreground/50">Despesas realizadas (R$)</div>
          <div className="text-lg font-bold text-red-600">{fmt(summary.despesasRealizadas)}</div>
        </div>
        <div className="px-4 py-3 text-center bg-emerald-500/10">
          <div className="text-xs text-foreground/50">Total do período (R$)</div>
          <div className="text-lg font-bold text-emerald-400">{fmt(summary.total)}</div>
        </div>
      </div>

      <div className="rounded-xl glass-card-elevated overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
              <th className="px-4 py-3 w-10"><input type="checkbox" className="rounded border-foreground/10" /></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Resumo do lançamento</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Situação</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Valor (R$)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Saldo (R$)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/[0.04]">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-foreground/50">Nenhum resultado encontrado</td></tr>
            )}
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-foreground/[0.02]">
                <td className="px-4 py-3"><input type="checkbox" className="rounded border-foreground/10" /></td>
                <td className="px-4 py-3 text-sm">{new Date(t.date).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 text-sm">{t.description}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-medium ${statusColors[t.status] || "text-foreground/50"}`}>
                    {statusLabels[t.status] || t.status}
                  </span>
                </td>
                <td className={`px-4 py-3 text-sm font-medium text-right ${t.type === "RECEIVABLE" ? "text-green-600" : "text-red-600"}`}>
                  {t.type !== "RECEIVABLE" ? "-" : ""}{fmt(Math.abs(t.value))}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-right">{fmt(t.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
