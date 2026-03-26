"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
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
import { createMovement } from "@/actions/inventory";
import { Send } from "lucide-react";

interface MovementFormProps {
  productId: string;
}

export function MovementForm({ productId }: MovementFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  async function handleAction(formData: FormData) {
    await createMovement(formData);
    formRef.current?.reset();
    router.refresh();
  }

  return (
    <form ref={formRef} action={handleAction} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo *</Label>
          <Select name="type" required defaultValue="">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IN">Entrada</SelectItem>
              <SelectItem value="OUT">Saída</SelectItem>
              <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantidade *</Label>
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min="1"
            required
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Motivo da movimentação..."
            rows={1}
          />
        </div>
      </div>

      <Button type="submit" size="sm">
        <Send className="h-4 w-4" />
        Registrar Movimentação
      </Button>
    </form>
  );
}
