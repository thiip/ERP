import Link from "next/link";
import { getFinancialDashboard } from "@/actions/erp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  Receipt,
  Briefcase,
  BarChart3,
  ArrowRight,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const monthLabels = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export default async function ErpPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const selectedYear = params.year ? parseInt(params.year) : 2025;
  const dashboard = await getFinancialDashboard(selectedYear);

  const maxMonthlyValue = Math.max(
    ...dashboard.monthlyPaid.map((v, i) => v + dashboard.monthlyPending[i]),
    1
  );

  const totalCategories = dashboard.categories.reduce((s, c) => s + c.value, 0);

  const categoryColors = [
    "bg-emerald-500/100", "bg-emerald-500", "bg-yellow-500/100", "bg-teal-500/100",
    "bg-red-500/100", "bg-teal-500/100", "bg-pink-500", "bg-green-500/100",
  ];

  return (
    <div className="space-y-6">
      {/* Header with year tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Financeiro {selectedYear}
          </h2>
          <p className="text-muted-foreground">
            Visão geral das despesas e pagamentos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dashboard.availableYears.map((y) => (
            <Link
              key={y}
              href={`/erp?year=${y}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                y === selectedYear
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      </div>

      {/* Visão Geral - Valores a receber / Valores a pagar */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Valores a receber */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Valores a receber</h3>
            <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 dark:bg-emerald-900/30 dark:text-emerald-400">
              Gerencie suas receitas
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Acompanhe os valores que você tem a receber e registre novas vendas e receitas.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/erp/invoices/new" className="group">
              <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-card p-6 transition-all hover:border-emerald-400 hover:bg-emerald-500/10/50 dark:hover:bg-emerald-950/20">
                <div className="rounded-xl bg-emerald-500/10 p-4 dark:bg-emerald-900/30">
                  <FileText className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                  Nova venda
                </span>
              </div>
            </Link>
            <Link href="/erp/receivables" className="group">
              <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-card p-6 transition-all hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20">
                <div className="rounded-xl bg-emerald-500/10 p-4 dark:bg-emerald-900/30">
                  <DollarSign className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                  Nova receita
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Valores a pagar */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Valores a pagar</h3>
            <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 dark:bg-emerald-900/30 dark:text-emerald-400">
              Preveja suas despesas
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Controle suas despesas e compras para manter o financeiro organizado.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/erp/expenses/new" className="group">
              <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-card p-6 transition-all hover:border-yellow-400 hover:bg-yellow-500/10/50 dark:hover:bg-yellow-950/20">
                <div className="rounded-xl bg-yellow-500/10 p-4 dark:bg-yellow-900/30">
                  <Receipt className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                  Nova despesa
                </span>
              </div>
            </Link>
            <Link href="/inventory/purchase-orders/new" className="group">
              <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-card p-6 transition-all hover:border-teal-400 hover:bg-teal-500/10/50 dark:hover:bg-teal-950/20">
                <div className="rounded-xl bg-teal-500/10 p-4 dark:bg-teal-900/30">
                  <ShoppingCart className="h-8 w-8 text-teal-500 dark:text-teal-400" />
                </div>
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                  Nova compra
                </span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-emerald-500/10 p-3 dark:bg-emerald-900/30">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Despesas Totais</p>
              <p className="text-xl font-bold">{formatCurrency(dashboard.totalDespesas)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-emerald-500/10 p-3 dark:bg-emerald-900/30">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pago</p>
              <p className="text-xl font-bold">{formatCurrency(dashboard.totalPago)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-yellow-500/10 p-3 dark:bg-yellow-900/30">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pendente</p>
              <p className="text-xl font-bold">{formatCurrency(dashboard.totalPendente)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-red-500/10 p-3 dark:bg-red-900/30">
              <TrendingUp className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Maior Despesa</p>
              <p className="text-xl font-bold">{formatCurrency(dashboard.maiorDespesa)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bar Chart - Monthly Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tendência Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5" style={{ height: 220 }}>
              {monthLabels.map((label, i) => {
                const paid = dashboard.monthlyPaid[i];
                const pending = dashboard.monthlyPending[i];
                const total = paid + pending;
                const paidHeight = total > 0 ? (paid / maxMonthlyValue) * 200 : 0;
                const pendingHeight = total > 0 ? (pending / maxMonthlyValue) * 200 : 0;

                return (
                  <div key={label} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex w-full flex-col items-center justify-end" style={{ height: 200 }}>
                      <div
                        className="w-full max-w-[28px] rounded-t bg-red-400 transition-all"
                        style={{ height: Math.max(pendingHeight, pending > 0 ? 2 : 0) }}
                        title={`Pendente: ${formatCurrency(pending)}`}
                      />
                      <div
                        className="w-full max-w-[28px] rounded-t bg-emerald-500 transition-all"
                        style={{ height: Math.max(paidHeight, paid > 0 ? 2 : 0) }}
                        title={`Pago: ${formatCurrency(paid)}`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Pago
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                Pendente
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Donut Chart - Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Geral</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative h-44 w-44">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                {(() => {
                  const total = dashboard.totalPago + dashboard.totalPendente;
                  const paidPct = total > 0 ? (dashboard.totalPago / total) * 100 : 0;
                  const pendingPct = total > 0 ? (dashboard.totalPendente / total) * 100 : 0;
                  return (
                    <>
                      <circle
                        cx="18" cy="18" r="15.9155"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-emerald-500"
                        strokeDasharray={`${paidPct} ${100 - paidPct}`}
                        strokeDashoffset="0"
                      />
                      <circle
                        cx="18" cy="18" r="15.9155"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-red-400"
                        strokeDasharray={`${pendingPct} ${100 - pendingPct}`}
                        strokeDashoffset={`${-paidPct}`}
                      />
                    </>
                  );
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-sm font-bold">
                  {formatCurrency(dashboard.totalDespesas)}
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded bg-emerald-500" />
                Pago
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded bg-red-400" />
                Pendente
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Categories + Transactions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.categories.map((cat, i) => {
              const pct = totalCategories > 0 ? (cat.value / totalCategories) * 100 : 0;
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate pr-4">{cat.name}</span>
                    <span className="shrink-0 font-medium">{formatCurrency(cat.value)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full ${categoryColors[i % categoryColors.length]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas Transações</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="pr-6 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.transactions.slice(0, 10).map((tx, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6 text-xs text-muted-foreground whitespace-nowrap">
                      {tx.date}
                    </TableCell>
                    <TableCell className="text-sm font-medium max-w-[200px] truncate">
                      {tx.description}
                    </TableCell>
                    <TableCell className="text-right text-sm whitespace-nowrap">
                      {formatCurrency(tx.value)}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <Badge
                        variant={tx.status === "Pago" ? "default" : "secondary"}
                        className={
                          tx.status === "Pago"
                            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/10 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }
                      >
                        {tx.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Button
          variant="outline"
          className="h-auto flex-col gap-2 p-6"
          render={<Link href="/erp/invoices" />}
        >
          <FileText className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium">Faturas</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Button>

        <Button
          variant="outline"
          className="h-auto flex-col gap-2 p-6"
          render={<Link href="/erp/expenses" />}
        >
          <Receipt className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium">Despesas</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Button>

        <Button
          variant="outline"
          className="h-auto flex-col gap-2 p-6"
          render={<Link href="/erp/contracts" />}
        >
          <Briefcase className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium">Contratos</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Button>

        <Button
          variant="outline"
          className="h-auto flex-col gap-2 p-6"
          render={<Link href="/erp/reports" />}
        >
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium">Relatórios</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
