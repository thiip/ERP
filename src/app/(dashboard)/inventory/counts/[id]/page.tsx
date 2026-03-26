"use client";

import { useEffect, useState, useTransition } from "react";
import { getInventoryCount, updateCountItem, completeInventoryCount } from "@/actions/inventory";
import { ArrowLeft, CheckCircle, Save, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

type CountItem = {
  id: string;
  systemQuantity: number;
  countedQuantity: number | null;
  product: {
    id: string;
    name: string;
    sku: string;
  };
};

type InventoryCountDetail = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  notes: string | null;
  items: CountItem[];
};

const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-foreground/[0.04] text-foreground/70",
  IN_PROGRESS: "bg-emerald-500/10 text-emerald-400",
  COMPLETED: "bg-green-100 text-green-400",
  CANCELLED: "bg-red-500/10 text-red-400",
};

export default function InventoryCountDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [count, setCount] = useState<InventoryCountDetail | null>(null);
  const [countedValues, setCountedValues] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const data = await getInventoryCount(id);
    const detail = data as unknown as InventoryCountDetail;
    setCount(detail);

    const initial: Record<string, string> = {};
    for (const item of detail.items) {
      if (item.countedQuantity !== null) {
        initial[item.id] = String(item.countedQuantity);
      }
    }
    setCountedValues(initial);
  }

  async function handleSaveItem(itemId: string) {
    const value = countedValues[itemId];
    if (value === undefined || value === "") return;
    startTransition(async () => {
      await updateCountItem(itemId, Number(value));
      loadData();
    });
  }

  async function handleComplete() {
    if (!confirm("Finalizar este inventário? Esta ação não pode ser desfeita.")) return;
    startTransition(async () => {
      await completeInventoryCount(id);
      loadData();
    });
  }

  if (!count) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-foreground/40 text-sm">Carregando...</div>
      </div>
    );
  }

  const isEditable = count.status === "DRAFT" || count.status === "IN_PROGRESS";

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/inventory/counts"
          className="rounded-lg border border-foreground/10 p-1.5 text-foreground/50 hover:text-foreground/70 hover:bg-foreground/[0.03] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{count.title}</h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                statusColors[count.status] || "bg-foreground/[0.04] text-foreground/70"
              }`}
            >
              {statusLabels[count.status] || count.status}
            </span>
          </div>
          <p className="text-sm text-foreground/50 mt-0.5">
            Criado em {new Date(count.createdAt).toLocaleDateString("pt-BR")}
            {count.completedAt &&
              ` - Finalizado em ${new Date(count.completedAt).toLocaleDateString("pt-BR")}`}
          </p>
        </div>
        {isEditable && (
          <button
            onClick={handleComplete}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <CheckCircle className="h-4 w-4" /> Finalizar inventário
          </button>
        )}
      </div>

      {count.notes && (
        <div className="rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] p-4 mb-4 text-sm text-foreground/60">
          {count.notes}
        </div>
      )}

      {/* Count Table */}
      <div className="rounded-xl glass-card-elevated overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Produto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">SKU</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Estoque Sistema</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Contagem</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Diferença</th>
              {isEditable && (
                <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/[0.04]">
            {count.items.length === 0 && (
              <tr>
                <td colSpan={isEditable ? 6 : 5} className="px-4 py-12 text-center text-foreground/50">
                  <ClipboardCheck className="h-8 w-8 mx-auto mb-2 text-foreground/30" />
                  Nenhum item neste inventário
                </td>
              </tr>
            )}
            {count.items.map((item) => {
              const counted = countedValues[item.id] !== undefined
                ? Number(countedValues[item.id])
                : item.countedQuantity;
              const diff = counted !== null && counted !== undefined
                ? counted - item.systemQuantity
                : null;

              return (
                <tr key={item.id} className="hover:bg-foreground/[0.02] transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{item.product.name}</td>
                  <td className="px-4 py-3 text-sm font-mono text-foreground/60">{item.product.sku}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">{item.systemQuantity}</td>
                  <td className="px-4 py-3 text-center">
                    {isEditable ? (
                      <input
                        type="number"
                        min="0"
                        value={countedValues[item.id] ?? ""}
                        onChange={(e) =>
                          setCountedValues((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        className="w-24 mx-auto rounded-lg border border-foreground/10 px-3 py-1 text-sm text-center focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        placeholder="-"
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {item.countedQuantity ?? "-"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {diff !== null ? (
                      <span
                        className={`text-sm font-medium ${
                          diff === 0
                            ? "text-green-600"
                            : diff < 0
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {diff > 0 ? "+" : ""}
                        {diff}
                      </span>
                    ) : (
                      <span className="text-sm text-foreground/40">-</span>
                    )}
                  </td>
                  {isEditable && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSaveItem(item.id)}
                        disabled={isPending || countedValues[item.id] === undefined}
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium px-2 py-1 rounded hover:bg-emerald-500/10 disabled:opacity-40 transition-colors"
                      >
                        <Save className="h-3.5 w-3.5" /> Salvar
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
