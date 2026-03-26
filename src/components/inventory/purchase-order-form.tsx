"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface PurchaseOrderFormProps {
  products: { id: string; name: string }[];
  action: (formData: FormData) => Promise<void>;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function PurchaseOrderForm({ products, action }: PurchaseOrderFormProps) {
  const router = useRouter();
  const [items, setItems] = useState<OrderItem[]>([
    { productId: "", quantity: 1, unitPrice: 0 },
  ]);

  function addItem() {
    setItems([...items, { productId: "", quantity: 1, unitPrice: 0 }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof OrderItem, value: string | number) {
    const updated = [...items];
    if (field === "productId") {
      updated[index].productId = value as string;
    } else if (field === "quantity") {
      updated[index].quantity = Number(value) || 0;
    } else if (field === "unitPrice") {
      updated[index].unitPrice = Number(value) || 0;
    }
    setItems(updated);
  }

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  async function handleSubmit(formData: FormData) {
    formData.set("items", JSON.stringify(items));
    await action(formData);
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="supplierName">Fornecedor *</Label>
          <Input
            id="supplierName"
            name="supplierName"
            required
            placeholder="Nome do fornecedor"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expectedDelivery">Data de Entrega Prevista</Label>
          <Input
            id="expectedDelivery"
            name="expectedDelivery"
            type="date"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itens da Ordem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="grid gap-4 sm:grid-cols-4 items-end">
              <div className="space-y-2">
                <Label>Produto *</Label>
                <Select
                  value={item.productId}
                  onValueChange={(value) =>
                    updateItem(index, "productId", value ?? "")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(index, "quantity", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Preço Unitário *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateItem(index, "unitPrice", e.target.value)
                  }
                />
              </div>

              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4" />
            Adicionar Item
          </Button>

          <div className="flex justify-end pt-4 border-t">
            <p className="text-lg font-semibold">
              Total: {formatCurrency(total)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit">Criar Ordem de Compra</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
