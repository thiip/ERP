"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getProductionRouting,
  addRoutingStep,
  updateRoutingStep,
  deleteRoutingStep,
  copyRouting,
} from "@/actions/production";
import { getProducts } from "@/actions/inventory";
import { Plus, Pencil, Trash2, Copy, Search, GripVertical, ArrowUp, ArrowDown, Route } from "lucide-react";

type Product = {
  id: string;
  name: string;
  sku: string | null;
};

type RoutingStep = {
  id: string;
  stepNumber: number;
  operation: string;
  workCenter: string;
  setupTime: number;
  processTime: number;
  description: string | null;
};

export default function RoutingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [steps, setSteps] = useState<RoutingStep[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingStep, setEditingStep] = useState<RoutingStep | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyFromProductId, setCopyFromProductId] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [isPending, startTransition] = useTransition();

  // Form state
  const [formStepNumber, setFormStepNumber] = useState("");
  const [formOperation, setFormOperation] = useState("");
  const [formWorkCenter, setFormWorkCenter] = useState("");
  const [formSetupTime, setFormSetupTime] = useState("");
  const [formProcessTime, setFormProcessTime] = useState("");
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProductId) loadRouting();
  }, [selectedProductId]);

  async function loadProducts() {
    const data = await getProducts();
    setProducts(data as unknown as Product[]);
  }

  async function loadRouting() {
    const data = await getProductionRouting(selectedProductId);
    const sorted = (data as unknown as RoutingStep[]).sort(
      (a, b) => a.stepNumber - b.stepNumber
    );
    setSteps(sorted);
  }

  function resetForm() {
    setFormStepNumber("");
    setFormOperation("");
    setFormWorkCenter("");
    setFormSetupTime("");
    setFormProcessTime("");
    setFormDescription("");
    setEditingStep(null);
    setShowForm(false);
  }

  function openEditForm(step: RoutingStep) {
    setFormStepNumber(String(step.stepNumber));
    setFormOperation(step.operation);
    setFormWorkCenter(step.workCenter);
    setFormSetupTime(String(step.setupTime));
    setFormProcessTime(String(step.processTime));
    setFormDescription(step.description || "");
    setEditingStep(step);
    setShowForm(true);
  }

  function openAddForm() {
    resetForm();
    const nextStep = steps.length > 0 ? Math.max(...steps.map((s) => s.stepNumber)) + 10 : 10;
    setFormStepNumber(String(nextStep));
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const payload = {
        productId: selectedProductId,
        stepNumber: parseInt(formStepNumber),
        operation: formOperation,
        workCenter: formWorkCenter,
        setupTime: parseFloat(formSetupTime),
        processTime: parseFloat(formProcessTime),
        description: formDescription || null,
      };

      if (editingStep) {
        await updateRoutingStep(editingStep.id, payload);
      } else {
        await addRoutingStep(payload);
      }
      resetForm();
      loadRouting();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta etapa do roteiro?")) return;
    startTransition(async () => {
      await deleteRoutingStep(id);
      loadRouting();
    });
  }

  async function handleMoveStep(index: number, direction: "up" | "down") {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === steps.length - 1) return;

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    const currentStep = steps[index];
    const swapStep = steps[swapIndex];

    startTransition(async () => {
      await updateRoutingStep(currentStep.id, { stepNumber: swapStep.stepNumber });
      await updateRoutingStep(swapStep.id, { stepNumber: currentStep.stepNumber });
      loadRouting();
    });
  }

  async function handleCopyRouting() {
    if (!copyFromProductId || !selectedProductId) return;
    startTransition(async () => {
      await copyRouting(copyFromProductId, selectedProductId);
      setShowCopyModal(false);
      setCopyFromProductId("");
      loadRouting();
    });
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchProduct.toLowerCase()))
  );

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const totalSetup = steps.reduce((sum, s) => sum + s.setupTime, 0);
  const totalProcess = steps.reduce((sum, s) => sum + s.processTime, 0);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Roteiro de Producao</h1>

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
              onClick={openAddForm}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Adicionar etapa
            </button>
            <button
              onClick={() => setShowCopyModal(true)}
              className="flex items-center gap-2 rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03]"
            >
              <Copy className="h-4 w-4" /> Copiar roteiro
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="rounded-xl glass-card p-5 shadow-sm mb-6">
              <h2 className="text-base font-semibold mb-4">
                {editingStep ? "Editar etapa" : "Adicionar etapa"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground/60 mb-1">N da etapa</label>
                    <input
                      type="number"
                      value={formStepNumber}
                      onChange={(e) => setFormStepNumber(e.target.value)}
                      required
                      className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground/60 mb-1">Operacao</label>
                    <input
                      value={formOperation}
                      onChange={(e) => setFormOperation(e.target.value)}
                      required
                      placeholder="Ex: Corte, Montagem, Pintura"
                      className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground/60 mb-1">Centro de trabalho</label>
                    <input
                      value={formWorkCenter}
                      onChange={(e) => setFormWorkCenter(e.target.value)}
                      required
                      placeholder="Ex: Linha 1, Bancada A"
                      className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground/60 mb-1">Tempo setup (min)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formSetupTime}
                      onChange={(e) => setFormSetupTime(e.target.value)}
                      required
                      className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground/60 mb-1">Tempo processo (min/un)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formProcessTime}
                      onChange={(e) => setFormProcessTime(e.target.value)}
                      required
                      className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/60 mb-1">Descricao</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={resetForm} className="text-sm text-foreground/50 hover:text-foreground/70">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isPending ? "Salvando..." : editingStep ? "Atualizar" : "Salvar"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Routing Table */}
          <div className="rounded-xl glass-card-elevated overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-foreground/[0.08] bg-foreground/[0.02]">
                  <th className="px-4 py-3 text-center text-xs font-medium text-foreground/50 uppercase w-16">N</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Operacao</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Centro de Trabalho</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Tempo Setup (min)</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Tempo Processo (min/un)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/50 uppercase">Descricao</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-foreground/50 uppercase">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/[0.04]">
                {steps.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-foreground/40">
                      <Route className="h-8 w-8 mx-auto mb-2 text-foreground/30" />
                      Nenhuma etapa cadastrada no roteiro deste produto.
                    </td>
                  </tr>
                )}
                {steps.map((step, index) => (
                  <tr key={step.id} className="hover:bg-foreground/[0.02]">
                    <td className="px-4 py-3 text-sm text-center font-mono font-medium">{step.stepNumber}</td>
                    <td className="px-4 py-3 text-sm font-medium">{step.operation}</td>
                    <td className="px-4 py-3 text-sm text-foreground/60">{step.workCenter}</td>
                    <td className="px-4 py-3 text-sm text-right">{step.setupTime}</td>
                    <td className="px-4 py-3 text-sm text-right">{step.processTime}</td>
                    <td className="px-4 py-3 text-sm text-foreground/50">{step.description || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleMoveStep(index, "up")}
                          disabled={index === 0}
                          className="rounded p-1 text-foreground/40 hover:text-foreground/60 hover:bg-foreground/[0.04] transition-all disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveStep(index, "down")}
                          disabled={index === steps.length - 1}
                          className="rounded p-1 text-foreground/40 hover:text-foreground/60 hover:bg-foreground/[0.04] transition-all disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openEditForm(step)}
                          className="rounded p-1 text-foreground/40 hover:text-emerald-600 hover:bg-emerald-500/10 transition-all"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(step.id)}
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

          {/* Totals */}
          {steps.length > 0 && (
            <div className="mt-4 rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground/70">Totais</span>
                <div className="flex gap-6">
                  <span className="text-foreground/60">Setup: <strong>{totalSetup} min</strong></span>
                  <span className="text-foreground/60">Processo: <strong>{totalProcess} min/un</strong></span>
                  <span className="text-emerald-400 font-bold">Total: {totalSetup + totalProcess} min</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Copy Routing Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-xl bg-card p-6 shadow-xl w-full max-w-md">
            <h2 className="text-base font-semibold mb-4">Copiar roteiro de outro produto</h2>
            <p className="text-sm text-foreground/50 mb-3">
              Selecione o produto de origem. As etapas serao copiadas para{" "}
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
                onClick={handleCopyRouting}
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
