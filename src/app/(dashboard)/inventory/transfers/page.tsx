"use client";

import { useEffect, useState, useTransition } from "react";
import { transferStock, getWarehouseSectors, getProducts, getMovements } from "@/actions/inventory";
import { ArrowRightLeft, ArrowRight, Package } from "lucide-react";

type Product = {
  id: string;
  name: string;
  sku: string;
};

type Sector = {
  id: string;
  code: string;
  name: string;
};

type Movement = {
  id: string;
  type: string;
  quantity: number;
  createdAt: string;
  notes: string | null;
  product: { name: string; sku: string };
  fromSector: { name: string } | null;
  toSector: { name: string } | null;
};

export default function TransfersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [prods, sects, movs] = await Promise.all([
      getProducts(),
      getWarehouseSectors(),
      getMovements({ type: "TRANSFER" }),
    ]);
    setProducts(prods as unknown as Product[]);
    setSectors(sects as unknown as Sector[]);
    setMovements(movs as unknown as Movement[]);
  }

  async function handleTransfer(formData: FormData) {
    startTransition(async () => {
      await transferStock(formData);
      loadData();
    });
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Transferências de estoque</h1>

      {/* Transfer Form */}
      <div className="rounded-xl glass-card p-5 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ArrowRightLeft className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-semibold">Nova transferência</h2>
        </div>
        <form action={handleTransfer} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground/60 mb-1">Produto</label>
              <select
                name="productId"
                required
                className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Selecione o produto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/60 mb-1">Quantidade</label>
              <input
                name="quantity"
                type="number"
                min="1"
                required
                className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Qtd"
              />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4 items-end">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-foreground/60 mb-1">De (origem)</label>
              <select
                name="fromSectorId"
                required
                className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Selecione o setor de origem...</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-center pb-1">
              <ArrowRight className="h-5 w-5 text-foreground/40" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-foreground/60 mb-1">Para (destino)</label>
              <select
                name="toSectorId"
                required
                className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Selecione o setor de destino...</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/60 mb-1">Observações</label>
            <input
              name="notes"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              placeholder="Motivo da transferência (opcional)"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <ArrowRightLeft className="h-4 w-4" />
              {isPending ? "Transferindo..." : "Transferir"}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Transfers */}
      <h2 className="text-base font-semibold mb-3">Transferências recentes</h2>
      <div className="rounded-xl glass-card-elevated overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Produto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Origem</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Destino</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Quantidade</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Observações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/[0.04]">
            {movements.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-foreground/50">
                  <Package className="h-8 w-8 mx-auto mb-2 text-foreground/30" />
                  Nenhuma transferência realizada
                </td>
              </tr>
            )}
            {movements.map((mov) => (
              <tr key={mov.id} className="hover:bg-foreground/[0.02] transition-colors">
                <td className="px-4 py-3 text-sm text-foreground/60">
                  {new Date(mov.createdAt).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-sm font-medium">{mov.product.name}</td>
                <td className="px-4 py-3 text-sm text-foreground/60">{mov.fromSector?.name || "-"}</td>
                <td className="px-4 py-3 text-center">
                  <ArrowRight className="h-4 w-4 text-foreground/40 mx-auto" />
                </td>
                <td className="px-4 py-3 text-sm text-foreground/60">{mov.toSector?.name || "-"}</td>
                <td className="px-4 py-3 text-sm font-medium text-right">{mov.quantity}</td>
                <td className="px-4 py-3 text-sm text-foreground/50">{mov.notes || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
