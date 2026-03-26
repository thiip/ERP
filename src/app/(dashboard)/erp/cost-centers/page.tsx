"use client";

import { useEffect, useState, useTransition } from "react";
import { getCostCenters, createCostCenter, deleteCostCenter } from "@/actions/financial";
import { Plus, Trash2, Pencil } from "lucide-react";

type CostCenter = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
};

export default function CostCentersPage() {
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const data = await getCostCenters();
    setCenters(data as unknown as CostCenter[]);
  }

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createCostCenter(formData);
      setShowForm(false);
      loadData();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este centro de custo?")) return;
    startTransition(async () => {
      await deleteCostCenter(id);
      loadData();
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Centros de custo</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" /> Novo centro de custo
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl glass-card p-5 shadow-sm">
          <h3 className="text-base font-semibold mb-4">Novo centro de custo</h3>
          <form action={handleCreate} className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground/70 mb-1">Nome</label>
              <input name="name" required className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm" />
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium text-foreground/70 mb-1">Código</label>
              <input name="code" className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm" />
            </div>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03]">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {isPending ? "Salvando..." : "Salvar"}
            </button>
          </form>
        </div>
      )}

      <div className="rounded-xl glass-card-elevated overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Código</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Nome</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/[0.04]">
            {centers.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-foreground/50">Nenhum centro de custo cadastrado.</td></tr>
            )}
            {centers.map((c) => (
              <tr key={c.id} className="hover:bg-foreground/[0.02]">
                <td className="px-4 py-3 text-sm font-mono text-foreground/60">{c.code || "-"}</td>
                <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${c.isActive ? "bg-green-100 text-green-400" : "bg-foreground/[0.04] text-foreground/50"}`}>
                    {c.isActive ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="rounded p-1 text-foreground/40 hover:text-foreground/60 hover:bg-foreground/[0.04]">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="rounded p-1 text-foreground/40 hover:text-red-600 hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
