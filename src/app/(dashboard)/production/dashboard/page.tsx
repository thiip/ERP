"use client";

import { useEffect, useState } from "react";
import { getProductionDashboard } from "@/actions/production";
import {
  ClipboardList,
  Play,
  CheckCircle2,
  AlertTriangle,
  Package,
  Clock,
  BarChart3,
  TrendingUp,
} from "lucide-react";

type DashboardData = {
  ordersByStatus: Record<string, number>;
  thisMonthProduction: number;
  pendingMaterials: {
    materialId: string;
    materialName: string;
    required: number;
    inStock: number;
    deficit: number;
  }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    title: string;
    status: string;
    requestedAt: string;
    items: { product: { name: string }; quantity: number }[];
  }[];
  productionEfficiency: {
    onTime: number;
    late: number;
    total: number;
    percentOnTime: number;
  };
};

const statusLabels: Record<string, string> = {
  PENDING: "Pendente",
  QUEUED: "Na Fila",
  IN_PROGRESS: "Em Producao",
  COMPLETED: "Concluida",
  CANCELLED: "Cancelada",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  QUEUED: "bg-emerald-500/10 text-emerald-400",
  IN_PROGRESS: "bg-green-100 text-green-400",
  COMPLETED: "bg-foreground/[0.04] text-foreground/60",
  CANCELLED: "bg-red-500/10 text-red-400",
};

const barColors: Record<string, string> = {
  PENDING: "bg-yellow-500/100",
  QUEUED: "bg-emerald-500/100",
  IN_PROGRESS: "bg-green-500/100",
  COMPLETED: "bg-foreground/40",
  CANCELLED: "bg-red-400",
};

export default function ProductionDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    getProductionDashboard().then((r) => setData(r as unknown as DashboardData));
  }, []);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v);

  if (!data) {
    return (
      <div>
        <h1 className="text-xl font-semibold mb-6">Dashboard de Producao</h1>
        <div className="flex items-center justify-center py-20 text-foreground/40 text-sm">
          Carregando...
        </div>
      </div>
    );
  }

  const totalOrders = Object.values(data.ordersByStatus).reduce((a, b) => a + b, 0);
  const inProduction = data.ordersByStatus["IN_PROGRESS"] || 0;
  const statusEntries = Object.entries(data.ordersByStatus);
  const maxStatusCount = Math.max(...statusEntries.map(([, c]) => c), 1);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Dashboard de Producao</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl glass-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-foreground/[0.04] p-2.5">
              <ClipboardList className="h-5 w-5 text-foreground/60" />
            </div>
            <div>
              <div className="text-xs text-foreground/50">Total Ordens</div>
              <div className="text-2xl font-bold text-foreground/90">{totalOrders}</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10/50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <Play className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-xs text-foreground/50">Em Producao</div>
              <div className="text-2xl font-bold text-emerald-400">{inProduction}</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-green-500/20 bg-green-500/10/50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2.5">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-xs text-foreground/50">Concluidas (mes)</div>
              <div className="text-2xl font-bold text-green-400">{data.thisMonthProduction}</div>
            </div>
          </div>
        </div>
        <div className={`rounded-xl border p-5 shadow-sm ${data.pendingMaterials.length > 0 ? "border-red-500/20 bg-red-500/10/50" : "border-foreground/[0.08] bg-card"}`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2.5 ${data.pendingMaterials.length > 0 ? "bg-red-500/10" : "bg-foreground/[0.04]"}`}>
              <AlertTriangle className={`h-5 w-5 ${data.pendingMaterials.length > 0 ? "text-red-600" : "text-foreground/60"}`} />
            </div>
            <div>
              <div className="text-xs text-foreground/50">Materiais em Falta</div>
              <div className={`text-2xl font-bold ${data.pendingMaterials.length > 0 ? "text-red-400" : "text-foreground/90"}`}>
                {data.pendingMaterials.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Orders by status chart */}
        <div className="rounded-xl glass-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-foreground/40" />
            <h2 className="text-base font-semibold">Ordens por Status</h2>
          </div>
          {statusEntries.length > 0 ? (
            <div className="space-y-3">
              {statusEntries.map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs text-foreground/60 w-24 text-right">
                    {statusLabels[status] || status}
                  </span>
                  <div className="flex-1 bg-foreground/[0.04] rounded-full h-6 relative">
                    <div
                      className={`h-6 rounded-full transition-all ${barColors[status] || "bg-foreground/40"}`}
                      style={{ width: `${(count / maxStatusCount) * 100}%`, minWidth: count > 0 ? "24px" : "0" }}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-foreground/70">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-foreground/40 text-center py-8">Nenhuma ordem encontrada.</p>
          )}

          {/* Efficiency */}
          {data.productionEfficiency.total > 0 && (
            <div className="mt-4 pt-4 border-t border-foreground/[0.04]">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-teal-500" />
                <span className="text-xs font-medium text-foreground/60">Eficiencia no prazo</span>
              </div>
              <div className="text-lg font-bold text-teal-600">
                {data.productionEfficiency.percentOnTime}%
                <span className="text-xs text-foreground/40 font-normal ml-2">
                  ({data.productionEfficiency.onTime} de {data.productionEfficiency.total})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Pending materials */}
        <div className="rounded-xl glass-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-4 w-4 text-foreground/40" />
            <h2 className="text-base font-semibold">Materiais em Deficit</h2>
          </div>
          {data.pendingMaterials.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.pendingMaterials.map((m) => (
                <div key={m.materialId} className="flex items-center justify-between rounded-lg bg-red-500/10 px-3 py-2">
                  <span className="text-sm font-medium text-red-800">{m.materialName}</span>
                  <div className="text-right">
                    <div className="text-sm font-bold text-red-400">-{fmt(m.deficit)}</div>
                    <div className="text-xs text-foreground/40">
                      Estoque: {fmt(m.inStock)} | Necessario: {fmt(m.required)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
              <p className="text-sm text-foreground/40">Nenhum material em falta</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-xl glass-card-elevated overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-foreground/[0.04]">
          <Clock className="h-4 w-4 text-foreground/40" />
          <h2 className="text-base font-semibold">Ordens Recentes</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Ordem</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Titulo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Produtos</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/[0.04]">
            {(!data.recentOrders || data.recentOrders.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-foreground/40">
                  Nenhuma ordem recente.
                </td>
              </tr>
            )}
            {data.recentOrders?.map((order) => (
              <tr key={order.id} className="hover:bg-foreground/[0.02]">
                <td className="px-4 py-3 text-sm font-medium">{order.orderNumber}</td>
                <td className="px-4 py-3 text-sm text-foreground/60">{order.title || "-"}</td>
                <td className="px-4 py-3 text-sm text-foreground/60">
                  {order.items?.map((i) => i.product.name).join(", ") || "-"}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      statusColors[order.status] || "bg-foreground/[0.04] text-foreground/70"
                    }`}
                  >
                    {statusLabels[order.status] || order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-right text-foreground/50">
                  {new Date(order.requestedAt).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
