"use client";

import { useState } from "react";
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

interface OrganizationOption {
  id: string;
  name: string;
}

interface ContactData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  organizationId: string | null;
  isPF: boolean;
  cpf: string | null;
  notes: string | null;
}

interface ContactFormProps {
  contact?: ContactData;
  organizations?: OrganizationOption[];
  action: (formData: FormData) => Promise<void>;
}

export function ContactForm({ contact, organizations = [], action }: ContactFormProps) {
  const router = useRouter();
  const [isPF, setIsPF] = useState(contact?.isPF ?? false);
  const [organizationId, setOrganizationId] = useState<string>(
    contact?.organizationId ?? ""
  );

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={contact?.name ?? ""}
            placeholder="Nome do contato"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={contact?.email ?? ""}
            placeholder="email@exemplo.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={contact?.phone ?? ""}
            placeholder="(00) 00000-0000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="position">Cargo</Label>
          <Input
            id="position"
            name="position"
            defaultValue={contact?.position ?? ""}
            placeholder="Cargo ou função"
          />
        </div>

        <div className="space-y-2">
          <Label>Empresa</Label>
          <input type="hidden" name="organizationId" value={organizationId} />
          <Select
            value={organizationId}
            onValueChange={(val) => setOrganizationId(val ?? "")}
          >
            <SelectTrigger className="w-full">
              <span>
                {organizationId
                  ? organizations.find((o) => o.id === organizationId)?.name ?? "Selecionar..."
                  : "Nenhuma"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhuma</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="isPF"
              name="isPF"
              value="true"
              checked={isPF}
              onChange={(e) => setIsPF(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="isPF" className="cursor-pointer">
              Pessoa Física (PF)
            </Label>
          </div>
        </div>

        {isPF && (
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              name="cpf"
              defaultValue={contact?.cpf ?? ""}
              placeholder="000.000.000-00"
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={contact?.notes ?? ""}
          placeholder="Notas sobre o contato..."
          rows={4}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit">
          {contact ? "Salvar Alterações" : "Criar Contato"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
