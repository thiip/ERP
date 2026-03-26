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
import type { Segment, ContactOrigin } from "@/generated/prisma/client";

const segmentLabels: Record<Segment, string> = {
  SHOPPING: "Shopping",
  PREFEITURA: "Prefeitura",
  CONDOMINIO: "Condomínio",
  EMPRESA: "Empresa",
  OUTRO: "Outro",
};

const originLabels: Record<ContactOrigin, string> = {
  INDICACAO: "Indicação",
  SITE: "Site",
  REDES_SOCIAIS: "Redes Sociais",
  PROSPECCAO: "Prospecção",
  OUTRO: "Outro",
};

interface OrganizationData {
  id: string;
  name: string;
  legalName: string | null;
  cnpj: string | null;
  segment: Segment;
  origin: ContactOrigin;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  notes: string | null;
}

interface OrganizationFormProps {
  organization?: OrganizationData;
  action: (formData: FormData) => Promise<void>;
}

export function OrganizationForm({ organization, action }: OrganizationFormProps) {
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>(
    organization?.segment ?? "OUTRO"
  );
  const [origin, setOrigin] = useState<ContactOrigin>(
    organization?.origin ?? "OUTRO"
  );

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Fantasia *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={organization?.name ?? ""}
            placeholder="Nome da empresa"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="legalName">Razão Social</Label>
          <Input
            id="legalName"
            name="legalName"
            defaultValue={organization?.legalName ?? ""}
            placeholder="Razão social"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input
            id="cnpj"
            name="cnpj"
            defaultValue={organization?.cnpj ?? ""}
            placeholder="00.000.000/0000-00"
          />
        </div>

        <div className="space-y-2">
          <Label>Segmento</Label>
          <input type="hidden" name="segment" value={segment} />
          <Select
            value={segment}
            onValueChange={(val) => setSegment(val as Segment)}
          >
            <SelectTrigger className="w-full">
              <span>{segmentLabels[segment]}</span>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(segmentLabels) as Segment[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {segmentLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Origem</Label>
          <input type="hidden" name="origin" value={origin} />
          <Select
            value={origin}
            onValueChange={(val) => setOrigin(val as ContactOrigin)}
          >
            <SelectTrigger className="w-full">
              <span>{originLabels[origin]}</span>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(originLabels) as ContactOrigin[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {originLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={organization?.phone ?? ""}
            placeholder="(00) 00000-0000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={organization?.email ?? ""}
            placeholder="email@exemplo.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            defaultValue={organization?.website ?? ""}
            placeholder="https://www.exemplo.com"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Endereço</Label>
          <Input
            id="address"
            name="address"
            defaultValue={organization?.address ?? ""}
            placeholder="Rua, número, complemento"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="neighborhood">Bairro</Label>
          <Input
            id="neighborhood"
            name="neighborhood"
            defaultValue={organization?.neighborhood ?? ""}
            placeholder="Bairro"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            name="city"
            defaultValue={organization?.city ?? ""}
            placeholder="Cidade"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">Estado</Label>
          <Input
            id="state"
            name="state"
            defaultValue={organization?.state ?? ""}
            placeholder="UF"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zipCode">CEP</Label>
          <Input
            id="zipCode"
            name="zipCode"
            defaultValue={organization?.zipCode ?? ""}
            placeholder="00000-000"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={organization?.notes ?? ""}
          placeholder="Notas sobre a empresa..."
          rows={4}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit">
          {organization ? "Salvar Alterações" : "Criar Empresa"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
