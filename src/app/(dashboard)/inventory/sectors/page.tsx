"use client";

import { useEffect, useState, useTransition } from "react";
import { getWarehouseSectors, createWarehouseSector, deleteWarehouseSector } from "@/actions/inventory";
import { Plus, Trash2, Pencil, Warehouse, Search } from "lucide-react";

type Sector = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count?: { stocks: number };
};

export default function SectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const data = await getWarehouseSectors();
    setSectors(data as unknown as Sector[]);
  }

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createWarehouseSector(formData);
      setShowForm(false);
      setEditingSector(null);
      loadData();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este setor?")) return;
    startTransition(async () => {
      await deleteWarehouseSector(id);
      loadData();
    });
  }

  const filtered = sectors.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Setores do armazém</h1>
        <button
          onClick={() => {
            setEditingSector(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo setor
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar setores..."
            className="w-full rounded-lg border border-foreground/10 pl-9 pr-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl glass-card p-5 shadow-sm mb-4">
          <h2 className="text-base font-semibold mb-4">
            {editingSector ? "Editar setor" : "Novo setor"}
          </h2>
          <form action={handleCreate} className="space-y-3">
            {editingSector && (
              <input type="hidden" name="id" value={editingSector.id} />
            )}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground/60 mb-1">Código</label>
                <input
                  name="code"
                  required
                  defaultValue={editingSector?.code || ""}
                  className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Ex: SET-01"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/60 mb-1">Nome</label>
                <input
                  name="name"
                  required
                  defaultValue={editingSector?.name || ""}
                  className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Nome do setor"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/60 mb-1">Descrição</label>
                <input
                  name="description"
                  defaultValue={editingSector?.description || ""}
                  className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Descrição (opcional)"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingSector(null);
                }}
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
      )}

      {/* Table */}
      <div className="rounded-xl glass-card-elevated overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Código</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Descrição</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Produtos</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/[0.04]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-foreground/50">
                  <Warehouse className="h-8 w-8 mx-auto mb-2 text-foreground/30" />
                  Nenhum setor cadastrado
                </td>
              </tr>
            )}
            {filtered.map((sector) => (
              <tr key={sector.id} className="hover:bg-foreground/[0.02] transition-colors">
                <td className="px-4 py-3 text-sm font-mono text-foreground/60">{sector.code}</td>
                <td className="px-4 py-3 text-sm font-medium">{sector.name}</td>
                <td className="px-4 py-3 text-sm text-foreground/60">{sector.description || "-"}</td>
                <td className="px-4 py-3 text-sm text-center">{sector._count?.stocks ?? 0}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      sector.isActive
                        ? "bg-green-100 text-green-400"
                        : "bg-foreground/[0.04] text-foreground/50"
                    }`}
                  >
                    {sector.isActive ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        setEditingSector(sector);
                        setShowForm(true);
                      }}
                      className="rounded p-1 text-foreground/40 hover:text-emerald-600 hover:bg-emerald-500/10 transition-all"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(sector.id)}
                      disabled={isPending}
                      className="rounded p-1 text-foreground/40 hover:text-red-600 hover:bg-red-500/10 transition-all"
                    >
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
