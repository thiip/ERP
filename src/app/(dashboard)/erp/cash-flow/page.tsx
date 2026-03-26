"use client";

import { useEffect, useState, useTransition } from "react";
import { getCashFlow } from "@/actions/financial";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";

type CashFlowDay = {
  date: string;
  receipts: number;
  payments: number;
  dayBalance: number;
  accumulatedBalance: number;
};

export default function CashFlowPage() {
  const [data, setData] = useState<CashFlowDay[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isPending, startTransition] = useTransition();
  const [showNewMenu, setShowNewMenu] = useState(false);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  useEffect(() => {
    loadData();
  }, [month, year]);

  async function loadData() {
    startTransition(async () => {
      const result = await getCashFlow(month, year);
      setData(result as unknown as CashFlowDay[]);
    });
  }

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  }

  const fmt = (v: unknown) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));

  const totalReceipts = data.reduce((sum, d) => sum + d.receipts, 0);
  const totalPayments = data.reduce((sum, d) => sum + d.payments, 0);
  const finalBalance = data.length > 0 ? data[data.length - 1].accumulatedBalance : 0;

  return (
    <div>
      {/* Header buttons */}
      <div className="flex items-center gap-3 mb-6">
        <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
          <FileText className="h-4 w-4" />
          Gerar relatório
        </button>
        <div className="relative">
          <button
            onClick={() => setShowNewMenu(!showNewMenu)}
            className="flex items-center gap-2 rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03]"
          >
            <Plus className="h-4 w-4" />
            Novo registro
            <ChevronDown className="h-3 w-3" />
          </button>
          {showNewMenu && (
            <div className="absolute top-full left-0 mt-1 w-48 rounded-lg glass-card shadow-lg z-10">
              <button className="w-full text-left px-4 py-2.5 text-sm text-foreground/70 hover:bg-foreground/[0.03] rounded-t-lg">
                Recebimento
              </button>
              <button className="w-full text-left px-4 py-2.5 text-sm text-foreground/70 hover:bg-foreground/[0.03] rounded-b-lg">
                Pagamento
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-4 mb-6">
        <div>
          <span className="text-xs text-foreground/50 block mb-1">Período</span>
          <div className="flex items-center gap-2 rounded-lg border border-foreground/10 px-3 py-1.5">
            <button onClick={prevMonth} className="text-foreground/50 hover:text-foreground/70">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {monthNames[month - 1]} de {year}
            </span>
            <button onClick={nextMonth} className="text-foreground/50 hover:text-foreground/70">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {data.length === 0 && !isPending ? (
        /* Empty state */
        <div className="rounded-xl glass-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <Wallet className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-medium text-foreground/90 mb-2">Nenhum registro encontrado</h3>
          <p className="text-sm text-foreground/50 max-w-md mx-auto">
            Acompanhe seu fluxo de caixa diariamente, por data de pagamento e recebimento
          </p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-0 rounded-xl glass-card mb-6 overflow-hidden">
            <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
              <div className="flex items-center justify-center gap-1 text-xs text-foreground/50 mb-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                Recebimentos (R$)
              </div>
              <div className="text-lg font-bold text-green-600">{fmt(totalReceipts)}</div>
            </div>
            <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
              <div className="flex items-center justify-center gap-1 text-xs text-foreground/50 mb-1">
                <TrendingDown className="h-3 w-3 text-red-500" />
                Pagamentos (R$)
              </div>
              <div className="text-lg font-bold text-red-600">{fmt(totalPayments)}</div>
            </div>
            <div className="px-4 py-3 text-center bg-emerald-500/10">
              <div className="text-xs text-foreground/50 mb-1">Saldo acumulado (R$)</div>
              <div className={`text-lg font-bold ${finalBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fmt(finalBalance)}
              </div>
            </div>
          </div>

          {/* Chart placeholder */}
          <div className="rounded-xl glass-card p-6 mb-6">
            <h3 className="text-sm font-medium text-foreground/70 mb-4">Fluxo de caixa diário</h3>
            <div className="h-48 flex items-end gap-1 justify-between px-2">
              {data.map((day, i) => {
                const maxVal = Math.max(...data.map(d => Math.max(d.receipts, d.payments)), 1);
                const rH = (day.receipts / maxVal) * 100;
                const pH = (day.payments / maxVal) * 100;
                return (
                  <div key={i} className="flex-1 flex items-end gap-0.5 justify-center">
                    <div
                      className="bg-green-400 rounded-t min-w-[4px]"
                      style={{ height: `${Math.max(rH, 2)}%` }}
                      title={`Recebimentos: ${fmt(day.receipts)}`}
                    />
                    <div
                      className="bg-red-400 rounded-t min-w-[4px]"
                      style={{ height: `${Math.max(pH, 2)}%` }}
                      title={`Pagamentos: ${fmt(day.payments)}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-foreground/50">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded bg-green-400" /> Recebimentos
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded bg-red-400" /> Pagamentos
              </div>
            </div>
          </div>

          {/* Daily table */}
          <div className="rounded-xl glass-card-elevated overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Data</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Recebimentos (R$)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Pagamentos (R$)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Saldo do dia (R$)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Saldo acumulado (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/[0.04]">
                {data.map((day) => (
                  <tr key={day.date} className="hover:bg-foreground/[0.02] transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">
                      {new Date(day.date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                      {day.receipts > 0 ? fmt(day.receipts) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                      {day.payments > 0 ? fmt(day.payments) : "-"}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${day.dayBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {fmt(day.dayBalance)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-bold ${day.accumulatedBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {fmt(day.accumulatedBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-foreground/[0.08] bg-foreground/[0.02] font-bold">
                  <td className="px-4 py-3 text-sm">Totais</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">{fmt(totalReceipts)}</td>
                  <td className="px-4 py-3 text-sm text-right text-red-600">{fmt(totalPayments)}</td>
                  <td className={`px-4 py-3 text-sm text-right ${totalReceipts - totalPayments >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmt(totalReceipts - totalPayments)}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right ${finalBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {fmt(finalBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
