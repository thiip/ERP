"use client";

import { useEffect, useState, useTransition } from "react";
import { getProducts, getBOM, addBOMItem, updateBOMItem, deleteBOMItem, copyBOM } from "@/actions/inventory";
import { Plus, Pencil, Trash2, Copy, Package, Search } from "lucide-react";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
};

type BOMItem = {
  id: string;
  materialId: string;
  material: Product;
  quantity: number;
  unit: string;
  lossPercent: number;
  isOptional: boolean;
  isAlternative: boolean;
  alternativeGroup: string | null;
  notes: string | null;
};

export default function BOMPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<BOMItem | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyFromProductId, setCopyFromProductId] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [isPending, startTransition] = useTransition();

  // Form state
  const [formMaterialId, setFormMaterialId] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formUnit, setFormUnit] = useState("un");
  const [formLossPercent, setFormLossPercent] = useState("0");
  const [formIsOptional, setFormIsOptional] = useState(false);
  const [formIsAlternative, setFormIsAlternative] = useState(false);
  const [formAlternativeGroup, setFormAlternativeGroup] = useState("");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProductId) loadBOM();
  }, [selectedProductId]);

  async function loadProducts() {
    const data = await getProducts();
    setProducts(data as unknown as Product[]);
  }

  async function loadBOM() {
    const data = await getBOM(selectedProductId);
    setBomItems(data as unknown as BOMItem[]);
  }

  function resetForm() {
    setFormMaterialId("");
    setFormQuantity("");
    setFormUnit("un");
    setFormLossPercent("0");
    setFormIsOptional(false);
    setFormIsAlternative(false);
    setFormAlternativeGroup("");
    setFormNotes("");
    setEditingItem(null);
    setShowForm(false);
  }

  function openEditForm(item: BOMItem) {
    setFormMaterialId(item.materialId);
    setFormQuantity(String(item.quantity));
    setFormUnit(item.unit);
    setFormLossPercent(String(item.lossPercent));
    setFormIsOptional(item.isOptional);
    setFormIsAlternative(item.isAlternative);
    setFormAlternativeGroup(item.alternativeGroup || "");
    setFormNotes(item.notes || "");
    setEditingItem(item);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        productId: selectedProductId,
        materialId: formMaterialId,
        quantity: parseFloat(formQuantity),
        unit: formUnit,
        lossPercent: parseFloat(formLossPercent),
        isOptional: formIsOptional,
        isAlternative: formIsAlternative,
        alternativeGroup: formAlternativeGroup || null,
        notes: formNotes || null,
      };

      if (editingItem) {
        await updateBOMItem(editingItem.id, payload);
      } else {
        await addBOMItem(payload);
      }
      resetForm();
      loadBOM();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este material da BOM?")) return;
    startTransition(async () => {
      await deleteBOMItem(id);
      loadBOM();
    });
  }

  async function handleCopyBOM() {
    if (!copyFromProductId || !selectedProductId) return;
    startTransition(async () => {
      await copyBOM(copyFromProductId, selectedProductId);
      setShowCopyModal(false);
      setCopyFromProductId("");
      loadBOM();
    });
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchProduct.toLowerCase()))
  );

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Lista de Materiais (BOM)</h1>

      {/* Product selector */}
      <div className="rounded-xl glass-card p-5 shadow-sm mb-6">
        <label className="block text-xs font-medium text-foreground/60 mb-1">Selecionar produto</label>
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

      {selectedProductId && (
        <>
          {/* Actions */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Adicionar material
            </button>
            <button
              onClick={() => setShowCopyModal(true)}
              className="flex items-center gap-2 rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03]"
            >
              <Copy className="h-4 w-4" /> Copiar BOM
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="rounded-xl glass-card p-5 shadow-sm mb-6">
              <h2 className="text-base font-semibold mb-4">
                {editingItem ? "Editar material" : "Adicionar material"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground/60 mb-1">Material</label>
                    <select
                      value={formMaterialId}
                      onChange={(e) => setFormMaterialId(e.target.value)}
                      required
                      className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm"
                    >
                      <option value="">Selecione...</option>
                      {products
                        .filter((p) => p.id !== selectedProductId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.sku ? `(${p.sku})` : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground/60 mb-1">Quantidade por unidade</label>
                    <input
                      type="number"
                      step="0.001"
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(e.target.value)}
                      required
                      className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground/60 mb-1">Unidade</label>
                    <input
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      required
                      className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground/60 mb-1">Perda (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formLossPercent}
                      onChange={(e) => setFormLossPercent(e.target.value)}
                      className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground/60 mb-1">Grupo alternativo</label>
                    <input
                      value={formAlternativeGroup}
                      onChange={(e) => setFormAlternativeGroup(e.target.value)}
                      placeholder="Ex: GrupoA"
                      className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="flex items-end gap-4 pb-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsOptional}
                        onChange={(e) => setFormIsOptional(e.target.checked)}
                        className="rounded border-foreground/10"
                      />
                      Opcional
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsAlternative}
                        onChange={(e) => setFormIsAlternative(e.target.checked)}
                        className="rounded border-foreground/10"
                      />
                      Alternativo
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/60 mb-1">Observacoes</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-sm text-foreground/50 hover:text-foreground/70"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isPending ? "Salvando..." : editingItem ? "Atualizar" : "Salvar"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* BOM Table */}
          <div className="rounded-xl glass-card-elevated overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Material</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Qtd/Unidade</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Unidade</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Perda (%)</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Opcional</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase">Alternativo</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/[0.04]">
                {bomItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-foreground/40">
                      <Package className="h-8 w-8 mx-auto mb-2 text-foreground/30" />
                      Nenhum material cadastrado na BOM deste produto.
                    </td>
                  </tr>
                )}
                {bomItems.map((item) => (
                  <tr key={item.id} className="hover:bg-foreground/[0.02]">
                    <td className="px-4 py-3 text-sm font-medium">
                      {item.material?.name || "-"}
                      {item.alternativeGroup && (
                        <span className="ml-2 text-xs text-foreground/40">({item.alternativeGroup})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-center">{item.unit}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.lossPercent}%</td>
                    <td className="px-4 py-3 text-sm text-center">
                      {item.isOptional ? (
                        <span className="inline-block rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs font-medium">Sim</span>
                      ) : (
                        <span className="text-foreground/40">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {item.isAlternative ? (
                        <span className="inline-block rounded-full bg-teal-500/10 text-teal-400 px-2 py-0.5 text-xs font-medium">Sim</span>
                      ) : (
                        <span className="text-foreground/40">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditForm(item)}
                          className="rounded p-1 text-foreground/40 hover:text-emerald-600 hover:bg-emerald-500/10 transition-all"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded p-1 text-foreground/40 hover:text-red-600 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Copy BOM Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-xl bg-card p-6 shadow-xl w-full max-w-md">
            <h2 className="text-base font-semibold mb-4">Copiar BOM de outro produto</h2>
            <p className="text-sm text-foreground/50 mb-3">
              Selecione o produto de origem. Os materiais serao copiados para{" "}
              <strong>{selectedProduct?.name}</strong>.
            </p>
            <select
              value={copyFromProductId}
              onChange={(e) => setCopyFromProductId(e.target.value)}
              className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm mb-4"
            >
              <option value="">-- Selecione o produto de origem --</option>
              {products
                .filter((p) => p.id !== selectedProductId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.sku ? `(${p.sku})` : ""}
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowCopyModal(false); setCopyFromProductId(""); }}
                className="text-sm text-foreground/50 hover:text-foreground/70"
              >
                Cancelar
              </button>
              <button
                onClick={handleCopyBOM}
                disabled={!copyFromProductId || isPending}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isPending ? "Copiando..." : "Copiar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
