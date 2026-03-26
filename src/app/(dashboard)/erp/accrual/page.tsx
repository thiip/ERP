"use client";

import { useEffect, useState } from "react";
import { getAccrualView, getAccrualSummary } from "@/actions/financial";
import { Plus, Download, Printer, Upload, ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";

type AccrualEntry = {
  id: string;
  competenceDate: string;
  origin: string;
  description: string;
  paymentMethod: string | null;
  value: number;
  type: "REVENUE" | "EXPENSE";
};

type Summary = { receitas: number; despesas: number; total: number };

export default function AccrualPage() {
  const [entries, setEntries] = useState<AccrualEntry[]>([]);
  const [summary, setSummary] = useState<Summary>({ receitas: 0, despesas: 0, total: 0 });
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  useEffect(() => { loadData(); }, [month, year]);

  async function loadData() {
    const [data, sum] = await Promise.all([
      getAccrualView(month, year),
      getAccrualSummary(month, year),
    ]);

    // Transform { invoices, expenses } into flat AccrualEntry[]
    const result = data as unknown as {
      invoices: Array<{
        id: string;
        competenceDate: string | null;
        dueDate: string;
        type: string;
        totalValue: number;
        notes: string | null;
        number: string;
        paymentMethod: string | null;
        contact: { name: string } | null;
        organization: { name: string } | null;
        financialCategory: { name: string } | null;
      }>;
      expenses: Array<{
        id: string;
        competenceDate: string | null;
        date: string;
        value: number;
        description: string;
        category: string | null;
        financialCategory: { name: string } | null;
      }>;
    };

    const mapped: AccrualEntry[] = [];

    for (const inv of result.invoices) {
      mapped.push({
        id: inv.id,
        competenceDate: inv.competenceDate || inv.dueDate,
        origin: inv.contact?.name || inv.organization?.name || "-",
        description: inv.notes || `Fatura ${inv.number}`,
        paymentMethod: inv.paymentMethod,
        value: Number(inv.totalValue),
        type: inv.type === "RECEIVABLE" ? "REVENUE" : "EXPENSE",
      });
    }

    for (const exp of result.expenses) {
      mapped.push({
        id: exp.id,
        competenceDate: exp.competenceDate || exp.date,
        origin: exp.financialCategory?.name || exp.category || "-",
        description: exp.description,
        paymentMethod: null,
        value: Number(exp.value),
        type: "EXPENSE",
      });
    }

    mapped.sort((a, b) => new Date(a.competenceDate).getTime() - new Date(b.competenceDate).getTime());

    setEntries(mapped);
    setSummary(sum as Summary);
  }

  function prevMonth() { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); }

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const filtered = entries.filter((e) => {
    if (!search) return true;
    return e.description.toLowerCase().includes(search.toLowerCase()) || e.origin.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          <Plus className="h-4 w-4" /> Nova
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03]">
          <Upload className="h-4 w-4" /> Importar planilha
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03]">
          <Download className="h-4 w-4" /> Exportar
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03]">
          <Printer className="h-4 w-4" /> Imprimir
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div>
          <span className="text-xs text-foreground/50 block mb-1">Competência</span>
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

      <div className="grid grid-cols-3 gap-0 rounded-xl glass-card mb-4 overflow-hidden">
        <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
          <div className="text-xs text-foreground/50">Receitas (R$)</div>
          <div className="text-lg font-bold text-green-600">{fmt(summary.receitas)}</div>
        </div>
        <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
          <div className="text-xs text-foreground/50">Despesas (R$)</div>
          <div className="text-lg font-bold text-red-600">{fmt(summary.despesas)}</div>
        </div>
        <div className="px-4 py-3 text-center bg-emerald-500/10">
          <div className="text-xs text-foreground/50">Total do período (R$)</div>
          <div className="text-lg font-bold text-emerald-400">{fmt(summary.total)}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2 text-sm text-foreground/50">
        <span>{selected.size} registro(s) selecionado(s)</span>
        {selected.size > 0 && (
          <>
            <button className="text-emerald-600 hover:text-emerald-800 font-medium">Editar lançamento(s)</button>
            <button className="text-red-600 hover:text-red-800 font-medium">Excluir lançamento(s)</button>
          </>
        )}
      </div>

      <div className="rounded-xl glass-card-elevated overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
              <th className="px-4 py-3 w-10"><input type="checkbox" className="rounded border-foreground/10" /></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Competência</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Origem</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Resumo do lançamento</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Cond. pagto</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Valor (R$)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/[0.04]">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-foreground/50">Nenhum resultado encontrado</td></tr>
            )}
            {filtered.map((e) => (
              <tr key={e.id} className="hover:bg-foreground/[0.02]">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(e.id)} onChange={(ev) => {
                    const next = new Set(selected);
                    ev.target.checked ? next.add(e.id) : next.delete(e.id);
                    setSelected(next);
                  }} className="rounded border-foreground/10" />
                </td>
                <td className="px-4 py-3 text-sm">{new Date(e.competenceDate).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 text-sm text-foreground/60">{e.origin}</td>
                <td className="px-4 py-3 text-sm">{e.description}</td>
                <td className="px-4 py-3 text-sm text-foreground/60">{e.paymentMethod || "-"}</td>
                <td className={`px-4 py-3 text-sm font-medium text-right ${e.type === "REVENUE" ? "text-green-600" : "text-red-600"}`}>
                  {e.type === "EXPENSE" ? "-" : ""}{fmt(Math.abs(e.value))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground/70">Totais do período</span>
          <span className="font-bold text-emerald-400">{fmt(summary.total)}</span>
        </div>
      </div>
    </div>
  );
}
