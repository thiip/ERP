"use client";

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

interface InvoiceFormProps {
  contacts: { id: string; name: string }[];
  action: (formData: FormData) => Promise<void>;
}

export function InvoiceForm({ contacts, action }: InvoiceFormProps) {
  const router = useRouter();

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="number">Número *</Label>
          <Input
            id="number"
            name="number"
            required
            placeholder="INV-001"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Tipo *</Label>
          <Select name="type" defaultValue="RECEIVABLE" required>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RECEIVABLE">A Receber</SelectItem>
              <SelectItem value="PAYABLE">A Pagar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactId">Contato</Label>
          <Select name="contactId" defaultValue="">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um contato" />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id}>
                  {contact.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalValue">Valor Total (R$) *</Label>
          <Input
            id="totalValue"
            name="totalValue"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0,00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Data de Vencimento *</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="issuedAt">Data de Emissão</Label>
          <Input
            id="issuedAt"
            name="issuedAt"
            type="date"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Notas sobre a fatura..."
          rows={4}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit">Criar Fatura</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
