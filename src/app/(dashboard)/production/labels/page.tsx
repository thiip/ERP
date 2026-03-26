"use client";

import { useEffect, useState, useTransition } from "react";
import { generateProductionLabel, getProductionOrders } from "@/actions/production";
import { Printer, Search, Tag, Package, QrCode } from "lucide-react";

type ProductionOrder = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  items: {
    id: string;
    product: { id: string; name: string; sku: string | null };
    plannedQuantity: number;
  }[];
};

type LabelData = {
  orderNumber: string;
  productName: string;
  productSku: string | null;
  quantity: number;
  date: string;
  barcode: string | null;
};

export default function LabelsPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [labelData, setLabelData] = useState<LabelData | null>(null);
  const [searchOrder, setSearchOrder] = useState("");
  const [labelQty, setLabelQty] = useState("1");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    const data = await getProductionOrders({});
    setOrders(data as unknown as ProductionOrder[]);
  }

  function handleOrderChange(orderId: string) {
    setSelectedOrderId(orderId);
    setSelectedItemId("");
    setLabelData(null);
  }

  function handleItemChange(itemId: string) {
    setSelectedItemId(itemId);
    setLabelData(null);
  }

  async function handleGenerateLabel() {
    if (!selectedOrderId || !selectedItemId) return;
    startTransition(async () => {
      const data = await generateProductionLabel({
        orderId: selectedOrderId,
        itemId: selectedItemId,
      });
      setLabelData(data as unknown as LabelData);
    });
  }

  function handlePrint() {
    window.print();
  }

  const filteredOrders = orders.filter((o) =>
    o.orderNumber.toLowerCase().includes(searchOrder.toLowerCase())
  );

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const copies = parseInt(labelQty) || 1;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6 print:hidden">Etiquetas de Producao</h1>

      {/* Selectors - hidden on print */}
      <div className="rounded-xl glass-card p-5 shadow-sm mb-6 print:hidden">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-foreground/60 mb-1">Ordem de producao</label>
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
              onChange={(e) => handleOrderChange(e.target.value)}
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
          <div>
            <label className="block text-xs font-medium text-foreground/60 mb-1">Produto / Item</label>
            <select
              value={selectedItemId}
              onChange={(e) => handleItemChange(e.target.value)}
              disabled={!selectedOrderId}
              className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm mt-[calc(0.5rem+2px+32px)] disabled:bg-foreground/[0.04]"
            >
              <option value="">-- Selecione o item --</option>
              {selectedOrder?.items?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.product.name} {item.product.sku ? `(${item.product.sku})` : ""} - Qtd: {item.plannedQuantity}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-end gap-3">
          <div className="w-32">
            <label className="block text-xs font-medium text-foreground/60 mb-1">Copias</label>
            <input
              type="number"
              min="1"
              max="100"
              value={labelQty}
              onChange={(e) => setLabelQty(e.target.value)}
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm"
            />
          </div>
          <button
            onClick={handleGenerateLabel}
            disabled={!selectedOrderId || !selectedItemId || isPending}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Tag className="h-4 w-4" /> {isPending ? "Gerando..." : "Gerar etiqueta"}
          </button>
          {labelData && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              <Printer className="h-4 w-4" /> Imprimir
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!labelData && (
        <div className="rounded-xl glass-card p-12 shadow-sm text-center print:hidden">
          <Tag className="h-10 w-10 mx-auto mb-3 text-foreground/30" />
          <p className="text-sm text-foreground/40">Selecione uma ordem e item para gerar a etiqueta.</p>
        </div>
      )}

      {/* Label preview / print area */}
      {labelData && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold print:hidden">Pre-visualizacao</h2>
          {Array.from({ length: copies }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-xl border-2 border-dashed border-foreground/10 bg-card p-6 shadow-sm max-w-md mx-auto print:border-solid print:border-black print:rounded-none print:shadow-none print:max-w-full print:p-4 print:break-after-page"
            >
              {/* Label content */}
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold uppercase tracking-wide">Producao</h3>
                <div className="h-px bg-foreground/20 my-2" />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-foreground/50 uppercase">Ordem</span>
                  <span className="text-sm font-bold">{labelData.orderNumber}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-foreground/50 uppercase">Produto</span>
                  <span className="text-sm font-bold">{labelData.productName}</span>
                </div>

                {labelData.productSku && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-foreground/50 uppercase">SKU</span>
                    <span className="text-sm font-mono">{labelData.productSku}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-foreground/50 uppercase">Quantidade</span>
                  <span className="text-sm font-bold">{labelData.quantity}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-foreground/50 uppercase">Data</span>
                  <span className="text-sm">
                    {new Date(labelData.date).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>

              {/* Barcode placeholder */}
              <div className="mt-4 pt-4 border-t border-foreground/[0.08]">
                <div className="flex flex-col items-center gap-1">
                  <QrCode className="h-16 w-16 text-foreground/90 print:h-20 print:w-20" />
                  <span className="text-xs font-mono text-foreground/50">
                    {labelData.barcode || labelData.orderNumber}
                  </span>
                </div>
              </div>

              {/* Copy number indicator (screen only) */}
              {copies > 1 && (
                <div className="mt-3 text-center text-xs text-foreground/40 print:hidden">
                  Copia {idx + 1} de {copies}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
