"use client";

import { useEffect, useState, useTransition } from "react";
import { calculateMRP, generateMRPPlan, executeMRPPlan } from "@/actions/production";
import { getProducts } from "@/actions/inventory";
import {
  Plus,
  Trash2,
  Calculator,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Search,
  Package,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
};

type PlanItem = {
  productId: string;
  productName: string;
  quantity: number;
};

type MRPResult = {
  materialId: string;
  materialName: string;
  required: number;
  inStock: number;
  inPurchaseOrders: number;
  deficit: number;
  unit: string;
};

export default function MRPPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [results, setResults] = useState<MRPResult[]>([]);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const data = await getProducts();
    setProducts(data as unknown as Product[]);
  }

  function addToPlan() {
    if (!selectedProductId || !quantity) return;
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    const existing = planItems.find((i) => i.productId === selectedProductId);
    if (existing) {
      setPlanItems(
        planItems.map((i) =>
          i.productId === selectedProductId
            ? { ...i, quantity: i.quantity + parseFloat(quantity) }
            : i
        )
      );
    } else {
      setPlanItems([
        ...planItems,
        { productId: selectedProductId, productName: product.name, quantity: parseFloat(quantity) },
      ]);
    }
    setSelectedProductId("");
    setQuantity("");
  }

  function removeFromPlan(productId: string) {
    setPlanItems(planItems.filter((i) => i.productId !== productId));
    setResults([]);
    setHasCalculated(false);
  }

  async function handleCalculateMRP() {
    startTransition(async () => {
      const items = planItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      }));
      const data = await calculateMRP(items);
      setResults(data as unknown as MRPResult[]);
      setHasCalculated(true);
    });
  }

  async function handleGeneratePurchaseOrders() {
    const deficitItems = results.filter((r) => r.deficit > 0);
    if (deficitItems.length === 0) return;
    if (!confirm(`Gerar pedidos de compra para ${deficitItems.length} material(is) em deficit?`)) return;

    startTransition(async () => {
      await executeMRPPlan(
        deficitItems.map((d) => ({
          materialId: d.materialId,
          quantity: d.deficit,
        }))
      );
      alert("Pedidos de compra gerados com sucesso!");
    });
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchProduct.toLowerCase()))
  );

  const deficitCount = results.filter((r) => r.deficit > 0).length;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">MRP - Planejamento de Necessidade de Materiais</h1>

      {/* Add to plan */}
      <div className="rounded-xl glass-card p-5 shadow-sm mb-6">
        <h2 className="text-base font-semibold mb-4">Plano de producao</h2>
        <div className="flex items-end gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-foreground/60 mb-1">Produto</label>
            <div className="relative mb-2">
              <input
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                placeholder="Pesquisar produto..."
                className="w-full rounded-lg border border-foreground/10 pl-9 pr-3 py-2 text-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
            </div>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm"
            >
              <option value="">-- Selecione um produto --</option>
              {filteredProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.sku ? `(${p.sku})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-foreground/60 mb-1">Quantidade</label>
            <input
              type="number"
              step="1"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={addToPlan}
            disabled={!selectedProductId || !quantity}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Adicionar ao plano
          </button>
        </div>

        {/* Plan items list */}
        {planItems.length > 0 ? (
          <div className="space-y-2">
            {planItems.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between rounded-lg border border-foreground/[0.08] px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-foreground/40" />
                  <span className="text-sm font-medium">{item.productName}</span>
                  <span className="text-sm text-foreground/50">x {fmt(item.quantity)}</span>
                </div>
                <button
                  onClick={() => removeFromPlan(item.productId)}
                  className="rounded p-1 text-foreground/40 hover:text-red-600 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground/40 text-center py-4">
            Adicione produtos ao plano para calcular o MRP.
          </p>
        )}
      </div>

      {/* Calculate button */}
      {planItems.length > 0 && (
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleCalculateMRP}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Calculator className="h-4 w-4" /> {isPending ? "Calculando..." : "Calcular MRP"}
          </button>
        </div>
      )}

      {/* Summary cards */}
      {hasCalculated && (
        <div className="grid grid-cols-3 gap-0 rounded-xl glass-card mb-6 overflow-hidden">
          <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
            <div className="text-xs text-foreground/50">Total de materiais</div>
            <div className="text-lg font-bold text-foreground/90">{results.length}</div>
          </div>
          <div className="px-4 py-3 text-center border-r border-foreground/[0.04]">
            <div className="text-xs text-foreground/50">Materiais OK</div>
            <div className="text-lg font-bold text-green-600">{results.length - deficitCount}</div>
          </div>
          <div className={`px-4 py-3 text-center ${deficitCount > 0 ? "bg-red-500/10" : ""}`}>
            <div className="text-xs text-foreground/50">Em deficit</div>
            <div className={`text-lg font-bold ${deficitCount > 0 ? "text-red-600" : "text-green-600"}`}>
              {deficitCount}
            </div>
          </div>
        </div>
      )}

      {/* Results table */}
      {hasCalculated && (
        <>
          <div className="rounded-xl glass-card-elevated overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Material</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Necessario</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Em Estoque</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Em Pedidos de Compra</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Deficit</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/[0.04]">
                {results.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-foreground/40">
                      Nenhum material necessario encontrado.
                    </td>
                  </tr>
                )}
                {results.map((r) => (
                  <tr
                    key={r.materialId}
                    className={`hover:bg-foreground/[0.02] ${r.deficit > 0 ? "bg-red-500/10/50" : ""}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium">{r.materialName}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {fmt(r.required)} {r.unit}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {fmt(r.inStock)} {r.unit}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {fmt(r.inPurchaseOrders)} {r.unit}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm text-right font-bold ${
                        r.deficit > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {r.deficit > 0 ? `-${fmt(r.deficit)}` : fmt(0)} {r.unit}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.deficit > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 text-red-400 px-2.5 py-0.5 text-xs font-medium">
                          <AlertTriangle className="h-3 w-3" /> Deficit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-400 px-2.5 py-0.5 text-xs font-medium">
                          <CheckCircle2 className="h-3 w-3" /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Generate purchase orders */}
          {deficitCount > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleGeneratePurchaseOrders}
                disabled={isPending}
                className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" />{" "}
                {isPending ? "Gerando..." : `Gerar pedidos de compra (${deficitCount} itens)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
