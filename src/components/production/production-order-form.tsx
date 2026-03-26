"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface ProductOption {
  id: string;
  name: string;
}

interface ProductionOrderFormProps {
  finishedProducts: ProductOption[];
  rawMaterials: ProductOption[];
  action: (formData: FormData) => Promise<void>;
}

interface ItemRow {
  key: number;
  productId: string;
  quantity: string;
}

interface MaterialRow {
  key: number;
  materialId: string;
  requiredQuantity: string;
}

export function ProductionOrderForm({
  finishedProducts,
  rawMaterials,
  action,
}: ProductionOrderFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<ItemRow[]>([
    { key: Date.now(), productId: "", quantity: "" },
  ]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [pending, setPending] = useState(false);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { key: Date.now(), productId: "", quantity: "" },
    ]);
  }

  function removeItem(key: number) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateItem(key: number, field: keyof ItemRow, value: string) {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, [field]: value } : i))
    );
  }

  function addMaterial() {
    setMaterials((prev) => [
      ...prev,
      { key: Date.now(), materialId: "", requiredQuantity: "" },
    ]);
  }

  function removeMaterial(key: number) {
    setMaterials((prev) => prev.filter((m) => m.key !== key));
  }

  function updateMaterial(
    key: number,
    field: keyof MaterialRow,
    value: string
  ) {
    setMaterials((prev) =>
      prev.map((m) => (m.key === key ? { ...m, [field]: value } : m))
    );
  }

  async function handleSubmit(formData: FormData) {
    setPending(true);

    const validItems = items
      .filter((i) => i.productId && i.quantity)
      .map((i) => ({
        productId: i.productId,
        quantity: parseFloat(i.quantity),
      }));

    const validMaterials = materials
      .filter((m) => m.materialId && m.requiredQuantity)
      .map((m) => ({
        materialId: m.materialId,
        requiredQuantity: parseFloat(m.requiredQuantity),
      }));

    formData.set("items", JSON.stringify(validItems));
    formData.set("materials", JSON.stringify(validMaterials));

    try {
      await action(formData);
    } catch {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados da Ordem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="Ex: Produção de cadeiras"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Descrição detalhada da ordem de produção"
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade (0-10)</Label>
              <Input
                id="priority"
                name="priority"
                type="number"
                min={0}
                max={10}
                defaultValue={0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedHours">Horas Estimadas</Label>
              <Input
                id="estimatedHours"
                name="estimatedHours"
                type="number"
                min={0}
                step={0.5}
                placeholder="Ex: 8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Observações adicionais"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Produtos a Produzir</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" />
            Adicionar Produto
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Adicione pelo menos um produto a ser produzido.
            </p>
          )}
          {items.map((item) => (
            <div key={item.key} className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <Label>Produto</Label>
                <Select
                  value={item.productId}
                  onValueChange={(val) =>
                    updateItem(item.key, "productId", val ?? "")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {finishedProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32 space-y-1">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(item.key, "quantity", e.target.value)
                  }
                  placeholder="0,00"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(item.key)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Materiais Necessários</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMaterial}
          >
            <Plus className="h-4 w-4" />
            Adicionar Material
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {materials.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum material adicionado. Clique em &quot;Adicionar
              Material&quot; se necessário.
            </p>
          )}
          {materials.map((mat) => (
            <div key={mat.key} className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <Label>Material</Label>
                <Select
                  value={mat.materialId}
                  onValueChange={(val) =>
                    updateMaterial(mat.key, "materialId", val ?? "")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um material" />
                  </SelectTrigger>
                  <SelectContent>
                    {rawMaterials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32 space-y-1">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={mat.requiredQuantity}
                  onChange={(e) =>
                    updateMaterial(mat.key, "requiredQuantity", e.target.value)
                  }
                  placeholder="0,00"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeMaterial(mat.key)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Criando..." : "Criar Ordem de Produção"}
        </Button>
      </div>
    </form>
  );
}
