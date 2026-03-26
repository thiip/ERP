"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getProductionOrders,
  reportProduction,
  reportByProduct,
  getProductionOrder,
} from "@/actions/production";
import { ClipboardCheck, Search, Package, CheckCircle2 } from "lucide-react";

type OrderItem = {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku: string | null;
    lotControl: boolean;
  };
  plannedQuantity: number;
  producedQuantity: number;
};

type ProductionOrder = {
  id: string;
  orderNumber: string;
  status: string;
  items: OrderItem[];
  createdAt: string;
};

export default function ReportingPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [reportQuantities, setReportQuantities] = useState<Record<string, string>>({});
  const [lotNumbers, setLotNumbers] = useState<Record<string, string>>({});
  const [searchOrder, setSearchOrder] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (selectedOrderId) loadOrderDetails();
  }, [selectedOrderId]);

  async function loadOrders() {
    const data = await getProductionOrders({ status: "IN_PROGRESS" });
    setOrders(data as unknown as ProductionOrder[]);
  }

  async function loadOrderDetails() {
    const data = await getProductionOrder(selectedOrderId);
    const order = data as unknown as ProductionOrder;
    setSelectedOrder(order);
    // Reset inputs
    const qtyMap: Record<string, string> = {};
    const lotMap: Record<string, string> = {};
    order.items?.forEach((item) => {
      qtyMap[item.id] = "";
      lotMap[item.id] = "";
    });
    setReportQuantities(qtyMap);
    setLotNumbers(lotMap);
  }

  async function handleReport(itemId: string) {
    const qty = parseFloat(reportQuantities[itemId]);
    if (!qty || qty <= 0) return;

    startTransition(async () => {
      await reportProduction({
        orderId: selectedOrderId,
        itemId,
        quantity: qty,
        lotNumber: lotNumbers[itemId] || undefined,
      });
      loadOrderDetails();
      setReportQuantities((prev) => ({ ...prev, [itemId]: "" }));
      setLotNumbers((prev) => ({ ...prev, [itemId]: "" }));
    });
  }

  function getProgressPercent(produced: number, planned: number): number {
    if (planned === 0) return 0;
    return Math.min(100, (produced / planned) * 100);
  }

  function getProgressColor(percent: number): string {
    if (percent >= 100) return "bg-green-500/100";
    if (percent >= 50) return "bg-emerald-500/100";
    if (percent >= 25) return "bg-yellow-500/100";
    return "bg-foreground/40";
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v);

  const filteredOrders = orders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(searchOrder.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Apontamento de Producao</h1>

      {/* Order selector */}
      <div className="rounded-xl glass-card p-5 shadow-sm mb-6">
        <label className="block text-xs font-medium text-foreground/60 mb-1">Selecionar ordem de producao (em andamento)</label>
        <div className="relative mb-2">
          <input
            value={searchOrder}
            onChange={(e) => setSearchOrder(e.target.value)}
            placeholder="Pesquisar por numero da ordem..."
            className="w-full rounded-lg border border-foreground/10 pl-9 pr-3 py-2 text-sm"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
        </div>
        <select
          value={selectedOrderId}
          onChange={(e) => setSelectedOrderId(e.target.value)}
          className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm"
        >
          <option value="">-- Selecione uma ordem --</option>
          {filteredOrders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.orderNumber} - {new Date(o.createdAt).toLocaleDateString("pt-BR")}
            </option>
          ))}
        </select>
      </div>

      {/* Order empty state */}
      {!selectedOrderId && (
        <div className="rounded-xl glass-card p-12 shadow-sm text-center">
          <ClipboardCheck className="h-10 w-10 mx-auto mb-3 text-foreground/30" />
          <p className="text-sm text-foreground/40">Selecione uma ordem de producao para iniciar o apontamento.</p>
        </div>
      )}

      {/* Order details and reporting */}
      {selectedOrder && selectedOrder.items && (
        <div className="space-y-4">
          {/* Order header */}
          <div className="rounded-xl glass-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Ordem {selectedOrder.orderNumber}</h2>
                <p className="text-sm text-foreground/50 mt-1">
                  Criada em {new Date(selectedOrder.createdAt).toLocaleDateString("pt-BR")} | Status:{" "}
                  <span className="inline-block rounded-full bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-xs font-medium">
                    {selectedOrder.status}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Items */}
          {selectedOrder.items.map((item) => {
            const remaining = item.plannedQuantity - item.producedQuantity;
            const percent = getProgressPercent(item.producedQuantity, item.plannedQuantity);
            const isComplete = percent >= 100;

            return (
              <div
                key={item.id}
                className={`rounded-xl border bg-card p-5 shadow-sm ${
                  isComplete ? "border-green-500/20 bg-green-500/10/30" : "border-foreground/[0.08]"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-foreground/40" />
                      <h3 className="text-sm font-semibold">{item.product.name}</h3>
                      {item.product.sku && (
                        <span className="text-xs text-foreground/40">({item.product.sku})</span>
                      )}
                      {isComplete && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <span className="text-foreground/50">{fmt(percent)}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-foreground/10 rounded-full h-2.5 mb-4">
                  <div
                    className={`h-2.5 rounded-full transition-all ${getProgressColor(percent)}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {/* Quantities */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="rounded-lg bg-foreground/[0.03] px-3 py-2 text-center">
                    <div className="text-xs text-foreground/50">Qtd Planejada</div>
                    <div className="text-sm font-bold text-foreground/90">{fmt(item.plannedQuantity)}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-center">
                    <div className="text-xs text-foreground/50">Qtd Produzida</div>
                    <div className="text-sm font-bold text-emerald-400">{fmt(item.producedQuantity)}</div>
                  </div>
                  <div className={`rounded-lg px-3 py-2 text-center ${remaining > 0 ? "bg-orange-500/10" : "bg-green-500/10"}`}>
                    <div className="text-xs text-foreground/50">Qtd Restante</div>
                    <div className={`text-sm font-bold ${remaining > 0 ? "text-orange-400" : "text-green-400"}`}>
                      {fmt(Math.max(0, remaining))}
                    </div>
                  </div>
                </div>

                {/* Report input */}
                {!isComplete && (
                  <div className="flex items-end gap-3 pt-2 border-t border-foreground/[0.04]">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-foreground/60 mb-1">Quantidade a apontar</label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max={remaining}
                        value={reportQuantities[item.id] || ""}
                        onChange={(e) =>
                          setReportQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        placeholder={`Max: ${fmt(remaining)}`}
                        className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm"
                      />
                    </div>
                    {item.product.lotControl && (
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-foreground/60 mb-1">Numero do lote</label>
                        <input
                          value={lotNumbers[item.id] || ""}
                          onChange={(e) =>
                            setLotNumbers((prev) => ({ ...prev, [item.id]: e.target.value }))
                          }
                          placeholder="Ex: LOTE-2026-001"
                          className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm"
                        />
                      </div>
                    )}
                    <button
                      onClick={() => handleReport(item.id)}
                      disabled={isPending || !reportQuantities[item.id]}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <ClipboardCheck className="h-4 w-4" /> {isPending ? "Apontando..." : "Apontar"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
