"use client";

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

interface ContractFormProps {
  contacts: { id: string; name: string }[];
  deals: { id: string; title: string }[];
  action: (formData: FormData) => Promise<void>;
}

export function ContractForm({ contacts, deals, action }: ContractFormProps) {
  const router = useRouter();

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="number">Numero *</Label>
          <Input
            id="number"
            name="number"
            required
            placeholder="CTR-001"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Titulo *</Label>
          <Input
            id="title"
            name="title"
            required
            placeholder="Titulo do contrato"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactId">Contato *</Label>
          <Select name="contactId" defaultValue="" required>
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
          <Label htmlFor="dealId">Negócio (opcional)</Label>
          <Select name="dealId" defaultValue="">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um negócio" />
            </SelectTrigger>
            <SelectContent>
              {deals.map((deal) => (
                <SelectItem key={deal.id} value={deal.id}>
                  {deal.title}
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
          <Label htmlFor="startDate">Data de Inicio *</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">Data de Fim *</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit">Criar Contrato</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
