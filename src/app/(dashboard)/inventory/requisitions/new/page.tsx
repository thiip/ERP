"use client";

import { useEffect, useState, useTransition } from "react";
import { createMaterialRequisition, getProducts } from "@/actions/inventory";
import { Plus, Trash2, ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  sku: string;
};

type RequisitionItem = {
  productId: string;
  quantity: number;
};

export default function NewRequisitionPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [description, setDescription] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [items, setItems] = useState<RequisitionItem[]>([{ productId: "", quantity: 1 }]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const data = await getProducts();
    setProducts(data as unknown as Product[]);
  }

  function addItem() {
    setItems([...items, { productId: "", quantity: 1 }]);
  }

  function removeItem(index: number) {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof RequisitionItem, value: string | number) {
    const updated = [...items];
    if (field === "quantity") {
      updated[index] = { ...updated[index], quantity: Number(value) };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setItems(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validItems = items.filter((item) => item.productId && item.quantity > 0);
    if (validItems.length === 0) {
      alert("Adicione ao menos um item.");
      return;
    }

    const formData = new FormData();
    formData.set("description", description);
    formData.set("costCenter", costCenter);
    formData.set("items", JSON.stringify(validItems));

    startTransition(async () => {
      await createMaterialRequisition(formData);
      router.push("/inventory/requisitions");
    });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/inventory/requisitions"
          className="rounded-lg border border-foreground/10 p-1.5 text-foreground/50 hover:text-foreground/70 hover:bg-foreground/[0.03] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold">Nova requisição de material</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="rounded-xl glass-card p-5 shadow-sm mb-6">
          <h2 className="text-base font-semibold mb-4">Informações gerais</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground/60 mb-1">Descrição</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Descrição da requisição"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/60 mb-1">Centro de custo</label>
              <input
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Ex: Produção, Manutenção..."
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl glass-card p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Itens da requisição</h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-800 font-medium"
            >
              <Plus className="h-4 w-4" /> Adicionar item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground/60 mb-1">
                    Produto {index + 1}
                  </label>
                  <select
                    value={item.productId}
                    onChange={(e) => updateItem(index, "productId", e.target.value)}
                    required
                    className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Selecione...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-foreground/60 mb-1">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    required
                    className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  className="rounded p-1.5 text-foreground/40 hover:text-red-600 hover:bg-red-500/10 disabled:opacity-30 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link
            href="/inventory/requisitions"
            className="rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03] transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
            {isPending ? "Criando..." : "Criar requisição"}
          </button>
        </div>
      </form>
    </div>
  );
}
