"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Upload, X, ImageIcon, Loader2 } from "lucide-react";

interface ProductData {
  id: string;
  name: string;
  sku: string | null;
  code: string | null;
  barcode: string | null;
  description: string | null;
  type: string;
  group: string | null;
  family: string | null;
  brand: string | null;
  unit: string;
  secondaryUnit: string | null;
  conversionFactor: number | null;
  isActive: boolean;
  // Stock
  minimumStock: number;
  maximumStock: number | null;
  reorderPoint: number;
  defaultSectorId: string | null;
  location: string | null;
  lotControl: boolean;
  serialControl: boolean;
  expiryControl: boolean;
  shelfLife: number | null;
  // Pricing
  costPrice: number | null;
  salePrice: number | null;
  weight: number | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  // Fiscal
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  icmsRate: number | null;
  ipiRate: number | null;
  pisRate: number | null;
  cofinsRate: number | null;
  origin: string | null;
  // Images
  imageUrl: string | null;
  images: string | null;
}

interface Sector {
  id: string;
  name: string;
}

interface ProductFormProps {
  product?: Partial<ProductData>;
  action: (formData: FormData) => Promise<void>;
  sectors?: Sector[];
}

const TABS = [
  { key: "geral", label: "Geral" },
  { key: "estoque", label: "Estoque" },
  { key: "precos", label: "Precos" },
  { key: "fiscal", label: "Fiscal" },
  { key: "imagens", label: "Imagens" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TYPE_OPTIONS = [
  { value: "FINISHED_PRODUCT", label: "Produto Acabado" },
  { value: "RAW_MATERIAL", label: "Materia-Prima" },
  { value: "SEMI_FINISHED", label: "Semi-acabado" },
  { value: "PACKAGING", label: "Embalagem" },
  { value: "CONSUMABLE", label: "Material de Consumo" },
];

const ORIGIN_OPTIONS = [
  { value: "0", label: "0 - Nacional" },
  { value: "1", label: "1 - Estrangeira Importacao Direta" },
  { value: "2", label: "2 - Estrangeira Adq. Mercado Interno" },
];

export function ProductForm({ product, action, sectors = [] }: ProductFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("geral");
  const [imagePreview, setImagePreview] = useState<string>(product?.imageUrl ?? "");
  const [additionalImages, setAdditionalImages] = useState<string[]>(() => {
    try {
      return product?.images ? JSON.parse(product.images) : [];
    } catch {
      return [];
    }
  });
  const [uploading, setUploading] = useState(false);
  const [uploadingAdditional, setUploadingAdditional] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);

  // Track required fields for tab completion indicators
  const [formValues, setFormValues] = useState({
    name: product?.name ?? "",
    type: product?.type ?? "FINISHED_PRODUCT",
    unit: product?.unit ?? "unidade",
  });

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${basePath}/api/upload-product`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erro ao fazer upload");
        return null;
      }
      return data.url;
    } catch {
      alert("Erro de conexão ao fazer upload");
      return null;
    }
  }, []);

  const handleMainImageUpload = useCallback(async (file: File) => {
    setUploading(true);
    const url = await uploadFile(file);
    if (url) setImagePreview(url);
    setUploading(false);
  }, [uploadFile]);

  const handleAdditionalImageUpload = useCallback(async (files: FileList) => {
    setUploadingAdditional(true);
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const url = await uploadFile(files[i]);
      if (url) newUrls.push(url);
    }
    setAdditionalImages(prev => [...prev, ...newUrls]);
    setUploadingAdditional(false);
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length === 1 && !imagePreview) {
      handleMainImageUpload(files[0]);
    } else if (files.length > 0) {
      handleAdditionalImageUpload(files);
    }
  }, [imagePreview, handleMainImageUpload, handleAdditionalImageUpload]);

  const removeAdditionalImage = useCallback((index: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  function isTabComplete(tab: TabKey): boolean {
    switch (tab) {
      case "geral":
        return formValues.name.trim() !== "" && formValues.type !== "" && formValues.unit.trim() !== "";
      default:
        return false; // Other tabs have no required fields
    }
  }

  function handleRequiredChange(field: string, value: string) {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <form action={action} className="space-y-6">
      {/* Tabs Navigation */}
      <div className="border-b border-foreground/[0.08]">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-foreground/50 hover:border-foreground/10 hover:text-foreground/70"
              }`}
            >
              {tab.label}
              {isTabComplete(tab.key) && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Geral */}
      <div className={activeTab === "geral" ? "block" : "hidden"}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="name" className="block text-xs font-medium text-foreground/60">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={product?.name ?? ""}
              onChange={(e) => handleRequiredChange("name", e.target.value)}
              placeholder="Nome do produto"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sku" className="block text-xs font-medium text-foreground/60">SKU</label>
            <input
              id="sku"
              name="sku"
              defaultValue={product?.sku ?? ""}
              placeholder="Codigo SKU"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="code" className="block text-xs font-medium text-foreground/60">Codigo</label>
            <input
              id="code"
              name="code"
              defaultValue={product?.code ?? ""}
              placeholder="Codigo interno"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="barcode" className="block text-xs font-medium text-foreground/60">Codigo de barras</label>
            <input
              id="barcode"
              name="barcode"
              defaultValue={product?.barcode ?? ""}
              placeholder="EAN / GTIN"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="type" className="block text-xs font-medium text-foreground/60">
              Tipo <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              name="type"
              defaultValue={product?.type ?? "FINISHED_PRODUCT"}
              onChange={(e) => handleRequiredChange("type", e.target.value)}
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none bg-card"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="group" className="block text-xs font-medium text-foreground/60">Grupo</label>
            <input
              id="group"
              name="group"
              defaultValue={product?.group ?? ""}
              placeholder="Grupo do produto"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="family" className="block text-xs font-medium text-foreground/60">Familia</label>
            <input
              id="family"
              name="family"
              defaultValue={product?.family ?? ""}
              placeholder="Familia do produto"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="brand" className="block text-xs font-medium text-foreground/60">Marca</label>
            <input
              id="brand"
              name="brand"
              defaultValue={product?.brand ?? ""}
              placeholder="Marca"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="unit" className="block text-xs font-medium text-foreground/60">
              Unidade principal <span className="text-red-500">*</span>
            </label>
            <input
              id="unit"
              name="unit"
              required
              defaultValue={product?.unit ?? "unidade"}
              onChange={(e) => handleRequiredChange("unit", e.target.value)}
              placeholder="Ex: UN, KG, L"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="secondaryUnit" className="block text-xs font-medium text-foreground/60">Unidade secundaria</label>
            <input
              id="secondaryUnit"
              name="secondaryUnit"
              defaultValue={product?.secondaryUnit ?? ""}
              placeholder="Ex: CX, PCT"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="conversionFactor" className="block text-xs font-medium text-foreground/60">Fator de conversao</label>
            <input
              id="conversionFactor"
              name="conversionFactor"
              type="number"
              step="0.0001"
              min="0"
              defaultValue={product?.conversionFactor ?? ""}
              placeholder="Ex: 12"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
            <label htmlFor="description" className="block text-xs font-medium text-foreground/60">Descricao</label>
            <textarea
              id="description"
              name="description"
              defaultValue={product?.description ?? ""}
              placeholder="Descricao detalhada do produto..."
              rows={3}
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
            />
          </div>

          <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
            <label htmlFor="isActive" className="text-xs font-medium text-foreground/60">Ativo</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="isActive"
                name="isActive"
                type="checkbox"
                defaultChecked={product?.isActive ?? true}
                value="true"
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-foreground/20 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>
        </div>
      </div>

      {/* Tab: Estoque */}
      <div className={activeTab === "estoque" ? "block" : "hidden"}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="minimumStock" className="block text-xs font-medium text-foreground/60">Estoque minimo</label>
            <input
              id="minimumStock"
              name="minimumStock"
              type="number"
              min="0"
              step="0.01"
              defaultValue={product?.minimumStock ?? 0}
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="maximumStock" className="block text-xs font-medium text-foreground/60">Estoque maximo</label>
            <input
              id="maximumStock"
              name="maximumStock"
              type="number"
              min="0"
              step="0.01"
              defaultValue={product?.maximumStock ?? ""}
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reorderPoint" className="block text-xs font-medium text-foreground/60">Ponto de reposicao</label>
            <input
              id="reorderPoint"
              name="reorderPoint"
              type="number"
              min="0"
              step="0.01"
              defaultValue={product?.reorderPoint ?? 0}
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="defaultSectorId" className="block text-xs font-medium text-foreground/60">Setor padrao</label>
            <select
              id="defaultSectorId"
              name="defaultSectorId"
              defaultValue={product?.defaultSectorId ?? ""}
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none bg-card"
            >
              <option value="">Selecione um setor</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="location" className="block text-xs font-medium text-foreground/60">Localizacao</label>
            <input
              id="location"
              name="location"
              defaultValue={product?.location ?? ""}
              placeholder="Ex: Prateleira A3"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="shelfLife" className="block text-xs font-medium text-foreground/60">Prazo de validade (dias)</label>
            <input
              id="shelfLife"
              name="shelfLife"
              type="number"
              min="0"
              defaultValue={product?.shelfLife ?? ""}
              placeholder="Dias"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-6 pt-2">
            <div className="flex items-center gap-3">
              <label htmlFor="lotControl" className="text-xs font-medium text-foreground/60">Controle por lote</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="lotControl"
                  name="lotControl"
                  type="checkbox"
                  defaultChecked={product?.lotControl ?? false}
                  value="true"
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-foreground/20 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="serialControl" className="text-xs font-medium text-foreground/60">Controle por serie</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="serialControl"
                  name="serialControl"
                  type="checkbox"
                  defaultChecked={product?.serialControl ?? false}
                  value="true"
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-foreground/20 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="expiryControl" className="text-xs font-medium text-foreground/60">Controle de validade</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="expiryControl"
                  name="expiryControl"
                  type="checkbox"
                  defaultChecked={product?.expiryControl ?? false}
                  value="true"
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-foreground/20 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Tab: Precos */}
      <div className={activeTab === "precos" ? "block" : "hidden"}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="costPrice" className="block text-xs font-medium text-foreground/60">Preco de custo (R$)</label>
            <input
              id="costPrice"
              name="costPrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.costPrice ?? ""}
              placeholder="0,00"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="salePrice" className="block text-xs font-medium text-foreground/60">Preco de venda (R$)</label>
            <input
              id="salePrice"
              name="salePrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.salePrice ?? ""}
              placeholder="0,00"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="weight" className="block text-xs font-medium text-foreground/60">Peso (kg)</label>
            <input
              id="weight"
              name="weight"
              type="number"
              step="0.001"
              min="0"
              defaultValue={product?.weight ?? ""}
              placeholder="0,000"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="width" className="block text-xs font-medium text-foreground/60">Largura (cm)</label>
            <input
              id="width"
              name="width"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.width ?? ""}
              placeholder="0,00"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="height" className="block text-xs font-medium text-foreground/60">Altura (cm)</label>
            <input
              id="height"
              name="height"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.height ?? ""}
              placeholder="0,00"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="depth" className="block text-xs font-medium text-foreground/60">Profundidade (cm)</label>
            <input
              id="depth"
              name="depth"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.depth ?? ""}
              placeholder="0,00"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tab: Fiscal */}
      <div className={activeTab === "fiscal" ? "block" : "hidden"}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label htmlFor="ncm" className="block text-xs font-medium text-foreground/60">NCM</label>
            <input
              id="ncm"
              name="ncm"
              defaultValue={product?.ncm ?? ""}
              placeholder="0000.00.00"
              maxLength={10}
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cest" className="block text-xs font-medium text-foreground/60">CEST</label>
            <input
              id="cest"
              name="cest"
              defaultValue={product?.cest ?? ""}
              placeholder="00.000.00"
              maxLength={9}
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cfop" className="block text-xs font-medium text-foreground/60">CFOP</label>
            <input
              id="cfop"
              name="cfop"
              defaultValue={product?.cfop ?? ""}
              placeholder="0000"
              maxLength={4}
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="origin" className="block text-xs font-medium text-foreground/60">Origem</label>
            <select
              id="origin"
              name="origin"
              defaultValue={product?.origin ?? "0"}
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none bg-card"
            >
              {ORIGIN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="icmsRate" className="block text-xs font-medium text-foreground/60">Aliquota ICMS (%)</label>
            <input
              id="icmsRate"
              name="icmsRate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={product?.icmsRate ?? ""}
              placeholder="0,00"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ipiRate" className="block text-xs font-medium text-foreground/60">Aliquota IPI (%)</label>
            <input
              id="ipiRate"
              name="ipiRate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={product?.ipiRate ?? ""}
              placeholder="0,00"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pisRate" className="block text-xs font-medium text-foreground/60">Aliquota PIS (%)</label>
            <input
              id="pisRate"
              name="pisRate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={product?.pisRate ?? ""}
              placeholder="0,00"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cofinsRate" className="block text-xs font-medium text-foreground/60">Aliquota COFINS (%)</label>
            <input
              id="cofinsRate"
              name="cofinsRate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              defaultValue={product?.cofinsRate ?? ""}
              placeholder="0,00"
              className="w-full rounded-lg border border-foreground/10 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tab: Imagens */}
      <div className={activeTab === "imagens" ? "block" : "hidden"}>
        {/* Hidden inputs to submit image data */}
        <input type="hidden" name="imageUrl" value={imagePreview} />
        <input type="hidden" name="images" value={JSON.stringify(additionalImages)} />

        <div
          className="space-y-6"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {/* Imagem principal */}
          <div>
            <h3 className="text-sm font-semibold text-foreground/70 mb-3">Imagem Principal</h3>
            <div className="flex items-start gap-4">
              {imagePreview ? (
                <div className="relative group">
                  <div className="h-32 w-32 rounded-lg border border-foreground/[0.08] overflow-hidden bg-foreground/[0.03] shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview.startsWith("/") ? `${basePath}${imagePreview}` : imagePreview}
                      alt="Foto principal"
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setImagePreview(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute -top-2 -right-2 bg-red-500/100 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className={`h-32 w-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
                    dragOver ? "border-emerald-500 bg-emerald-500/10" : "border-foreground/10 hover:border-emerald-400 hover:bg-foreground/[0.03]"
                  }`}
                >
                  {uploading ? (
                    <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-foreground/40" />
                      <span className="text-xs text-foreground/50">Enviar foto</span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleMainImageUpload(file);
                }}
              />
              <div className="text-xs text-foreground/50 space-y-1 pt-2">
                <p>Clique ou arraste uma imagem</p>
                <p>JPG, PNG, WebP, GIF ou SVG</p>
                <p>Tamanho máximo: 5MB</p>
              </div>
            </div>
          </div>

          {/* Imagens adicionais */}
          <div>
            <h3 className="text-sm font-semibold text-foreground/70 mb-3">Imagens Adicionais</h3>
            <div className="flex flex-wrap gap-3">
              {additionalImages.map((url, idx) => (
                <div key={idx} className="relative group">
                  <div className="h-24 w-24 rounded-lg border border-foreground/[0.08] overflow-hidden bg-foreground/[0.03] shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url.startsWith("/") ? `${basePath}${url}` : url} alt={`Foto ${idx + 1}`} className="h-full w-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAdditionalImage(idx)}
                    className="absolute -top-2 -right-2 bg-red-500/100 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => additionalFileInputRef.current?.click()}
                disabled={uploadingAdditional}
                className={`h-24 w-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors ${
                  dragOver ? "border-emerald-500 bg-emerald-500/10" : "border-foreground/10 hover:border-emerald-400 hover:bg-foreground/[0.03]"
                }`}
              >
                {uploadingAdditional ? (
                  <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="h-5 w-5 text-foreground/40" />
                    <span className="text-[10px] text-foreground/50">Adicionar</span>
                  </>
                )}
              </button>
              <input
                ref={additionalFileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) handleAdditionalImageUpload(files);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-foreground/[0.08] pt-4">
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {product ? "Salvar Alteracoes" : "Criar Produto"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-foreground/10 bg-card px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/[0.03] transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
