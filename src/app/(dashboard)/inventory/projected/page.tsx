"use client";

import { useEffect, useState } from "react";
import { getProducts, getAllProjectedStock } from "@/actions/inventory";
import { TrendingUp, TrendingDown, Package, BarChart3 } from "lucide-react";

type Product = {
  id: string;
  name: string;
  sku: string;
};

type ProjectedStockItem = {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  inboundPending: number;
  outboundPending: number;
  projectedStock: number;
};

export default function ProjectedStockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [projectedData, setProjectedData] = useState<ProjectedStockItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [prods, projected] = await Promise.all([
      getProducts(),
      getAllProjectedStock(),
    ]);
    setProducts(prods as unknown as Product[]);
    setProjectedData(projected as unknown as ProjectedStockItem[]);
  }

  const filtered = selectedProduct
    ? projectedData.filter((item) => item.productId === selectedProduct)
    : projectedData;

  const selectedItem = selectedProduct
    ? projectedData.find((item) => item.productId === selectedProduct)
    : null;

  function getMaxStock(): number {
    if (!selectedItem) return 100;
    return Math.max(
      selectedItem.currentStock,
      selectedItem.projectedStock,
      selectedItem.inboundPending,
      selectedItem.outboundPending,
      1
    );
  }

  function barWidth(value: number): string {
    const max = getMaxStock();
    return `${Math.min((value / max) * 100, 100)}%`;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Estoque projetado</h1>

      {/* Product Selector */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-foreground/60 mb-1">Filtrar por produto</label>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 max-w-md w-full"
        >
          <option value="">Todos os produtos</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
      </div>

      {/* Visual Bars for selected product */}
      {selectedItem && (
        <div className="rounded-xl glass-card p-5 shadow-sm mb-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            {selectedItem.productName}
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground/60">Estoque atual</span>
                <span className="text-sm font-bold">{selectedItem.currentStock}</span>
              </div>
              <div className="h-4 bg-foreground/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500/100 rounded-full transition-all"
                  style={{ width: barWidth(selectedItem.currentStock) }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground/60 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" /> Entradas previstas
                </span>
                <span className="text-sm font-bold text-green-600">+{selectedItem.inboundPending}</span>
              </div>
              <div className="h-4 bg-foreground/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500/100 rounded-full transition-all"
                  style={{ width: barWidth(selectedItem.inboundPending) }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground/60 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-500" /> Saídas previstas
                </span>
                <span className="text-sm font-bold text-red-600">-{selectedItem.outboundPending}</span>
              </div>
              <div className="h-4 bg-foreground/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500/100 rounded-full transition-all"
                  style={{ width: barWidth(selectedItem.outboundPending) }}
                />
              </div>
            </div>
            <div className="pt-2 border-t border-foreground/[0.08]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground/70">Estoque projetado</span>
                <span
                  className={`text-sm font-bold ${
                    selectedItem.projectedStock <= 0 ? "text-red-600" : "text-emerald-400"
                  }`}
                >
                  {selectedItem.projectedStock}
                </span>
              </div>
              <div className="h-4 bg-foreground/[0.04] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    selectedItem.projectedStock <= 0 ? "bg-red-500/100" : "bg-emerald-700"
                  }`}
                  style={{ width: barWidth(Math.max(selectedItem.projectedStock, 0)) }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-0 rounded-xl glass-card mb-4 overflow-hidden">
        <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
          <div className="text-xs text-foreground/50">Total produtos</div>
          <div className="text-lg font-bold text-foreground/70">{filtered.length}</div>
        </div>
        <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
          <div className="text-xs text-foreground/50">Entradas previstas</div>
          <div className="text-lg font-bold text-green-600">
            {filtered.reduce((sum, i) => sum + i.inboundPending, 0)}
          </div>
        </div>
        <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
          <div className="text-xs text-foreground/50">Saídas previstas</div>
          <div className="text-lg font-bold text-red-600">
            {filtered.reduce((sum, i) => sum + i.outboundPending, 0)}
          </div>
        </div>
        <div className="px-4 py-3 text-center bg-emerald-500/10">
          <div className="text-xs text-foreground/50">Estoque negativo</div>
          <div className="text-lg font-bold text-red-600">
            {filtered.filter((i) => i.projectedStock < 0).length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl glass-card-elevated overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Produto</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Estoque Atual</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Entradas Previstas</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Saídas Previstas</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Estoque Projetado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/[0.04]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-foreground/50">
                  <Package className="h-8 w-8 mx-auto mb-2 text-foreground/30" />
                  Nenhum dado disponível
                </td>
              </tr>
            )}
            {filtered.map((item) => (
              <tr
                key={item.productId}
                className={`transition-colors ${
                  item.projectedStock < 0 ? "bg-red-500/10 hover:bg-red-500/10/70" : "hover:bg-foreground/[0.02]"
                }`}
              >
                <td className="px-4 py-3">
                  <div className="text-sm font-medium">{item.productName}</div>
                  <div className="text-xs text-foreground/50 font-mono">{item.sku}</div>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-right">{item.currentStock}</td>
                <td className="px-4 py-3 text-sm font-medium text-right text-green-600">
                  +{item.inboundPending}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-right text-red-600">
                  -{item.outboundPending}
                </td>
                <td
                  className={`px-4 py-3 text-sm font-bold text-right ${
                    item.projectedStock < 0 ? "text-red-600" : "text-emerald-400"
                  }`}
                >
                  {item.projectedStock}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
