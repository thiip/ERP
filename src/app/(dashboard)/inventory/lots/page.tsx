"use client";

import { useEffect, useState, useTransition } from "react";
import { getProductLots, createProductLot, getExpiringLots, getProducts } from "@/actions/inventory";
import { Plus, Search, Package, AlertTriangle, X } from "lucide-react";

type Product = {
  id: string;
  name: string;
  sku: string;
};

type Lot = {
  id: string;
  lotNumber: string;
  serialNumber: string | null;
  quantity: number;
  manufacturingDate: string | null;
  expiryDate: string | null;
  supplierName: string | null;
  status: string;
  product: { id: string; name: string; sku: string };
};

type Tab = "ALL" | "EXPIRED" | "EXPIRING" | "VALID";

export default function LotsPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [tab, setTab] = useState<Tab>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [lotsData, productsData] = await Promise.all([
      getProductLots(),
      getProducts(),
    ]);
    setLots(lotsData as unknown as Lot[]);
    setProducts(productsData as unknown as Product[]);
  }

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createProductLot(formData);
      setShowForm(false);
      loadData();
    });
  }

  function isExpired(date: string | null): boolean {
    if (!date) return false;
    return new Date(date) < new Date();
  }

  function isExpiringSoon(date: string | null): boolean {
    if (!date) return false;
    const now = new Date();
    const expiry = new Date(date);
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return expiry >= now && expiry <= thirtyDays;
  }

  const filtered = lots.filter((lot) => {
    if (search) {
      const q = search.toLowerCase();
      const matchesSearch =
        lot.lotNumber.toLowerCase().includes(q) ||
        lot.product.name.toLowerCase().includes(q) ||
        lot.serialNumber?.toLowerCase().includes(q) ||
        lot.supplierName?.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    if (productFilter && lot.product.id !== productFilter) return false;

    if (tab === "EXPIRED") return isExpired(lot.expiryDate);
    if (tab === "EXPIRING") return isExpiringSoon(lot.expiryDate);
    if (tab === "VALID") return !isExpired(lot.expiryDate) && !isExpiringSoon(lot.expiryDate);
    return true;
  });

  function getRowClass(lot: Lot): string {
    if (isExpired(lot.expiryDate)) return "bg-red-500/10 hover:bg-red-500/10/70";
    if (isExpiringSoon(lot.expiryDate)) return "bg-yellow-500/10 hover:bg-yellow-100/70";
    return "hover:bg-foreground/[0.02]";
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "ALL", label: "Todos" },
    { key: "EXPIRED", label: "Vencidos" },
    { key: "EXPIRING", label: "A vencer (30 dias)" },
    { key: "VALID", label: "Válidos" },
  ];

  const expiredCount = lots.filter((l) => isExpired(l.expiryDate)).length;
  const expiringCount = lots.filter((l) => isExpiringSoon(l.expiryDate)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Lotes</h1>
          {(expiredCount > 0 || expiringCount > 0) && (
            <div className="flex items-center gap-3 mt-1">
              {expiredCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3" /> {expiredCount} vencido(s)
                </span>
              )}
              {expiringCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-yellow-600">
                  <AlertTriangle className="h-3 w-3" /> {expiringCount} a vencer
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo lote
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <span className="text-xs text-foreground/50 block mb-1">Pesquisar</span>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por lote, produto, série..."
              className="w-full rounded-lg border border-foreground/10 pl-9 pr-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
          </div>
        </div>
        <div>
          <span className="text-xs text-foreground/50 block mb-1">Produto</span>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Todos os produtos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-foreground/[0.08]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-foreground/50 hover:text-foreground/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* New Lot Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Novo lote</h2>
              <button onClick={() => setShowForm(false)} className="text-foreground/40 hover:text-foreground/60">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form action={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground/60 mb-1">Produto</label>
                <select
                  name="productId"
                  required
                  className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Selecione...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground/60 mb-1">Nº do Lote</label>
                  <input
                    name="lotNumber"
                    required
                    className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Ex: LOT-2024-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/60 mb-1">Nº Série</label>
                  <input
                    name="serialNumber"
                    className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Opcional"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/60 mb-1">Quantidade</label>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  required
                  className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground/60 mb-1">Data de fabricação</label>
                  <input
                    name="manufacturingDate"
                    type="date"
                    className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/60 mb-1">Data de validade</label>
                  <input
                    name="expiryDate"
                    type="date"
                    className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/60 mb-1">Fornecedor</label>
                <input
                  name="supplierName"
                  className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Nome do fornecedor"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-sm text-foreground/50 hover:text-foreground/70 px-3 py-1.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isPending ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl glass-card-elevated overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Produto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Nº do Lote</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Nº Série</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Quantidade</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Fabricação</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Validade</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Fornecedor</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/[0.04]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-foreground/50">
                  <Package className="h-8 w-8 mx-auto mb-2 text-foreground/30" />
                  Nenhum lote encontrado
                </td>
              </tr>
            )}
            {filtered.map((lot) => (
              <tr key={lot.id} className={`transition-colors ${getRowClass(lot)}`}>
                <td className="px-4 py-3 text-sm font-medium">{lot.product.name}</td>
                <td className="px-4 py-3 text-sm font-mono">{lot.lotNumber}</td>
                <td className="px-4 py-3 text-sm text-foreground/60">{lot.serialNumber || "-"}</td>
                <td className="px-4 py-3 text-sm text-right font-medium">{lot.quantity}</td>
                <td className="px-4 py-3 text-sm text-foreground/60">
                  {lot.manufacturingDate
                    ? new Date(lot.manufacturingDate).toLocaleDateString("pt-BR")
                    : "-"}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={
                      isExpired(lot.expiryDate)
                        ? "text-red-600 font-medium"
                        : isExpiringSoon(lot.expiryDate)
                        ? "text-yellow-600 font-medium"
                        : "text-foreground/60"
                    }
                  >
                    {lot.expiryDate
                      ? new Date(lot.expiryDate).toLocaleDateString("pt-BR")
                      : "-"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-foreground/60">{lot.supplierName || "-"}</td>
                <td className="px-4 py-3 text-center">
                  {isExpired(lot.expiryDate) ? (
                    <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-500/10 text-red-400">
                      Vencido
                    </span>
                  ) : isExpiringSoon(lot.expiryDate) ? (
                    <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">
                      A vencer
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-400">
                      Válido
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
