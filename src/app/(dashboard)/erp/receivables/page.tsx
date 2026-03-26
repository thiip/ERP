"use client";

import { useEffect, useState, useTransition } from "react";
import { getReceivables, getReceivablesSummary, markAsReceived, deleteInvoice } from "@/actions/financial";
import { Plus, Download, Printer, Upload, ChevronLeft, ChevronRight, Search, Trash2 } from "lucide-react";
import Link from "next/link";

type ReceivableInvoice = {
  id: string;
  number: string;
  totalValue: unknown;
  receivedValue: unknown;
  status: string;
  dueDate: string;
  receivedAt: string | null;
  notes: string | null;
  category: string | null;
  contact: { name: string } | null;
  organization: { name: string } | null;
};

type Summary = {
  vencidos: number;
  vencemHoje: number;
  aVencer: number;
  recebidos: number;
  total: number;
};

const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  ISSUED: "Em aberto",
  RECEIVED: "Recebido",
  OVERDUE: "Vencido",
  CANCELLED: "Cancelado",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-foreground/[0.04] text-foreground/70",
  ISSUED: "bg-emerald-500/10 text-emerald-400",
  RECEIVED: "bg-green-100 text-green-400",
  OVERDUE: "bg-red-500/10 text-red-400",
  CANCELLED: "bg-foreground/[0.04] text-foreground/50",
};

export default function ReceivablesPage() {
  const [invoices, setInvoices] = useState<ReceivableInvoice[]>([]);
  const [summary, setSummary] = useState<Summary>({ vencidos: 0, vencemHoje: 0, aVencer: 0, recebidos: 0, total: 0 });
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  useEffect(() => {
    loadData();
  }, [month, year]);

  async function loadData() {
    const [inv, sum] = await Promise.all([
      getReceivables(month, year),
      getReceivablesSummary(month, year),
    ]);
    setInvoices(inv as unknown as ReceivableInvoice[]);
    setSummary(sum as Summary);
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  }

  async function handleMarkReceived(id: string) {
    startTransition(async () => {
      await markAsReceived(id);
      loadData();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta conta a receber?")) return;
    startTransition(async () => {
      await deleteInvoice(id);
      loadData();
    });
  }

  const fmt = (v: unknown) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));

  const filtered = invoices.filter((inv) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      inv.number.toLowerCase().includes(s) ||
      inv.contact?.name.toLowerCase().includes(s) ||
      inv.organization?.name.toLowerCase().includes(s) ||
      inv.notes?.toLowerCase().includes(s)
    );
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/erp/invoices/new"
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova receita
        </Link>
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
        <div className="self-end">
          <button className="rounded-lg border border-foreground/10 px-4 py-1.5 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03]">
            Mais filtros
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-0 rounded-xl glass-card mb-4 overflow-hidden">
        <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
          <div className="text-xs text-foreground/50">Vencidos (R$)</div>
          <div className="text-lg font-bold text-red-600">{fmt(summary.vencidos)}</div>
        </div>
        <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
          <div className="text-xs text-foreground/50">Vencem hoje (R$)</div>
          <div className="text-lg font-bold text-orange-600">{fmt(summary.vencemHoje)}</div>
        </div>
        <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
          <div className="text-xs text-foreground/50">A vencer (R$)</div>
          <div className="text-lg font-bold text-emerald-600">{fmt(summary.aVencer)}</div>
        </div>
        <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
          <div className="text-xs text-foreground/50">Recebidos (R$)</div>
          <div className="text-lg font-bold text-green-600">{fmt(summary.recebidos)}</div>
        </div>
        <div className="px-4 py-3 text-center bg-emerald-500/10">
          <div className="text-xs text-foreground/50">Total do período (R$)</div>
          <div className="text-lg font-bold text-emerald-400">{fmt(summary.total)}</div>
        </div>
      </div>

      {/* Batch actions */}
      <div className="flex items-center gap-3 mb-2 text-sm text-foreground/50">
        <span>{selected.size} registro(s) selecionado(s)</span>
        {selected.size > 0 && (
          <>
            <button className="text-emerald-600 hover:text-emerald-800 font-medium">Renegociar</button>
            <button className="text-emerald-600 hover:text-emerald-800 font-medium">Ações em lote</button>
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
                    if (e.target.checked) setSelected(new Set(filtered.map((i) => i.id)));
                    else setSelected(new Set());
                  }}
                  className="rounded border-foreground/10"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Vencimento</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Cliente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Resumo do lançamento</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Total (R$)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">A receber (R$)</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Situação</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/[0.04]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-foreground/50">
                  Nenhum resultado encontrado
                </td>
              </tr>
            )}
            {filtered.map((inv) => {
              const remaining = Number(inv.totalValue) - Number(inv.receivedValue || 0);
              return (
                <tr key={inv.id} className="hover:bg-foreground/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(inv.id)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(inv.id);
                        else next.delete(inv.id);
                        setSelected(next);
                      }}
                      className="rounded border-foreground/10"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(inv.dueDate).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {inv.contact?.name || inv.organization?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground/60">
                    {inv.notes || inv.category || `Fatura ${inv.number}`}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right">
                    {fmt(inv.totalValue)}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right">
                    {fmt(remaining)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[inv.status]}`}>
                      {statusLabels[inv.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {inv.status !== "RECEIVED" && inv.status !== "CANCELLED" && (
                        <button
                          onClick={() => handleMarkReceived(inv.id)}
                          disabled={isPending}
                          className="text-xs text-green-600 hover:text-green-800 font-medium px-2 py-1 rounded hover:bg-green-500/10"
                        >
                          Receber
                        </button>
                      )}
                      {inv.status === "DRAFT" && (
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="rounded p-1 text-foreground/40 hover:text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
