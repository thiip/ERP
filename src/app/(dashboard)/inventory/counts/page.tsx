"use client";

import { useEffect, useState, useTransition } from "react";
import { getInventoryCounts, createInventoryCount } from "@/actions/inventory";
import { Plus, ClipboardList, X, Eye } from "lucide-react";
import Link from "next/link";

type InventoryCount = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  _count?: { items: number };
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

export default function CountsPage() {
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const data = await getInventoryCounts();
    setCounts(data as unknown as InventoryCount[]);
  }

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createInventoryCount(formData);
      setShowForm(false);
      loadData();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Inventário físico</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo inventário
        </button>
      </div>

      {/* New Count Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Novo inventário</h2>
              <button onClick={() => setShowForm(false)} className="text-foreground/40 hover:text-foreground/60">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form action={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground/60 mb-1">Título</label>
                <input
                  name="title"
                  required
                  className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Ex: Inventário mensal - Março 2026"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/60 mb-1">Observações</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Observações (opcional)"
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
                  {isPending ? "Criando..." : "Criar inventário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Counts List */}
      <div className="rounded-xl glass-card-elevated overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Título</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Data</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Status</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Itens</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/[0.04]">
            {counts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-foreground/50">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 text-foreground/30" />
                  Nenhum inventário cadastrado
                </td>
              </tr>
            )}
            {counts.map((count) => (
              <tr key={count.id} className="hover:bg-foreground/[0.02] transition-colors">
                <td className="px-4 py-3 text-sm font-medium">{count.title}</td>
                <td className="px-4 py-3 text-sm text-foreground/60">
                  {new Date(count.createdAt).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      statusColors[count.status] || "bg-foreground/[0.04] text-foreground/70"
                    }`}
                  >
                    {statusLabels[count.status] || count.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-center">{count._count?.items ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/inventory/counts/${count.id}`}
                    className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-800 font-medium px-2 py-1 rounded hover:bg-emerald-500/10 transition-colors"
                  >
                    <Eye className="h-4 w-4" /> Ver detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
