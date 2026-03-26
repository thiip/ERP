"use client";

import { useEffect, useState, useTransition } from "react";
import { getCategories, createCategory, deleteCategory } from "@/actions/financial";
import { Plus, Trash2, Circle } from "lucide-react";

type Category = {
  id: string;
  name: string;
  type: string;
  color: string | null;
  parentId: string | null;
  isDefault: boolean;
  children: Category[];
};

export default function CategoriesPage() {
  const [revenueCategories, setRevenueCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState<"REVENUE" | "EXPENSE" | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [rev, exp] = await Promise.all([
      getCategories("REVENUE"),
      getCategories("EXPENSE"),
    ]);
    setRevenueCategories(rev as unknown as Category[]);
    setExpenseCategories(exp as unknown as Category[]);
  }

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      await createCategory(formData);
      setShowForm(null);
      loadData();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta categoria?")) return;
    startTransition(async () => {
      await deleteCategory(id);
      loadData();
    });
  }

  function CategoryList({ categories, level = 0 }: { categories: Category[]; level?: number }) {
    return (
      <>
        {categories.map((cat) => (
          <div key={cat.id}>
            <div className={`flex items-center justify-between py-2 px-3 hover:bg-foreground/[0.03] rounded-lg group ${level > 0 ? "ml-6" : ""}`}>
              <div className="flex items-center gap-2">
                <Circle className="h-3 w-3" fill={cat.color || "#6B7280"} stroke={cat.color || "#6B7280"} />
                <span className="text-sm">{cat.name}</span>
                {cat.isDefault && (
                  <span className="text-xs text-foreground/40">(padrão)</span>
                )}
              </div>
              {!cat.isDefault && (
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="opacity-0 group-hover:opacity-100 rounded p-1 text-foreground/40 hover:text-red-600 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {cat.children?.length > 0 && <CategoryList categories={cat.children} level={level + 1} />}
          </div>
        ))}
      </>
    );
  }

  function CategoryForm({ type }: { type: "REVENUE" | "EXPENSE" }) {
    const categories = type === "REVENUE" ? revenueCategories : expenseCategories;
    return (
      <form action={handleCreate} className="mt-3 space-y-3 rounded-lg border border-foreground/[0.08] bg-foreground/[0.03] p-4">
        <input type="hidden" name="type" value={type} />
        <div>
          <label className="block text-xs font-medium text-foreground/60 mb-1">Nome</label>
          <input name="name" required className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground/60 mb-1">Categoria pai (opcional)</label>
          <select name="parentId" className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm">
            <option value="">Nenhuma (raiz)</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground/60 mb-1">Cor</label>
          <input name="color" type="color" defaultValue="#3B82F6" className="h-8 w-16 rounded border border-foreground/10 cursor-pointer" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setShowForm(null)} className="text-sm text-foreground/50 hover:text-foreground/70">Cancelar</button>
          <button type="submit" disabled={isPending} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Categorias financeiras</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Revenue */}
        <div className="rounded-xl glass-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-green-400">Receitas</h2>
            <button onClick={() => setShowForm("REVENUE")} className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 font-medium">
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </div>
          <CategoryList categories={revenueCategories} />
          {showForm === "REVENUE" && <CategoryForm type="REVENUE" />}
          {revenueCategories.length === 0 && !showForm && (
            <p className="text-sm text-foreground/40 text-center py-4">Nenhuma categoria de receita cadastrada.</p>
          )}
        </div>

        {/* Expense */}
        <div className="rounded-xl glass-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-red-400">Despesas</h2>
            <button onClick={() => setShowForm("EXPENSE")} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 font-medium">
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </div>
          <CategoryList categories={expenseCategories} />
          {showForm === "EXPENSE" && <CategoryForm type="EXPENSE" />}
          {expenseCategories.length === 0 && !showForm && (
            <p className="text-sm text-foreground/40 text-center py-4">Nenhuma categoria de despesa cadastrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}
