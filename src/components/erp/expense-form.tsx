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

interface ExpenseFormProps {
  action: (formData: FormData) => Promise<void>;
}

export function ExpenseForm({ action }: ExpenseFormProps) {
  const router = useRouter();
  const [isShared, setIsShared] = useState(false);

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Categoria *</Label>
          <Select name="category" defaultValue="" required>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Aluguel">Aluguel</SelectItem>
              <SelectItem value="Energia">Energia</SelectItem>
              <SelectItem value="Salários">Salarios</SelectItem>
              <SelectItem value="Material">Material</SelectItem>
              <SelectItem value="Transporte">Transporte</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="Outros">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descricao *</Label>
          <Input
            id="description"
            name="description"
            required
            placeholder="Descricao da despesa"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="value">Valor (R$) *</Label>
          <Input
            id="value"
            name="value"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Data *</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              id="isShared"
              name="isShared"
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="isShared">Despesa Compartilhada</Label>
          </div>
        </div>

        {isShared && (
          <div className="space-y-2">
            <Label htmlFor="splitRatio">Percentual de Rateio (%)</Label>
            <Input
              id="splitRatio"
              name="splitRatio"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="50"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit">Criar Despesa</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
