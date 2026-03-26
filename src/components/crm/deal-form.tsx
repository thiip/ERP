"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { DynamicField } from "@/components/crm/dynamic-field";
import { getContactsByOrganization } from "@/actions/crm";

interface DealData {
  id: string;
  title: string;
  organizationId: string | null;
  contactId: string | null;
  value: number | string | null;
  stage: string;
  budget: number | string | null;
  decorationTheme: string | null;
  considerations: string | null;
  notes: string | null;
  address: string | null;
  freightByClient: boolean | null;
  freightDescription: string | null;
  origin: string | null;
  startDate: string | Date | null;
  assignedToId: string | null;
  expectedCloseDate: string | Date | null;
}

interface OrgOption { id: string; name: string }
interface ContactOption { id: string; name: string }
interface UserOption { id: string; name: string }

interface StageFieldData {
  id: string;
  name: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  options: string | null;
  placeholder: string | null;
  helpText: string | null;
  section: string;
  order: number;
}

interface StageSectionData {
  id: string;
  name: string;
  label: string;
  order: number;
}

interface DealFormProps {
  deal?: DealData;
  action: (formData: FormData) => Promise<void>;
  organizations: OrgOption[];
  contacts?: ContactOption[];
  users?: UserOption[];
  pipelineId?: string;
  pipelineStageId?: string;
  stageFields?: StageFieldData[];
  stageSections?: StageSectionData[];
  fieldValues?: Record<string, string>;
  stageName?: string;
}

function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

export function DealForm({
  deal,
  action,
  organizations,
  contacts: initialContacts,
  users,
  pipelineId,
  pipelineStageId,
  stageFields = [],
  stageSections = [],
  fieldValues = {},
  stageName,
}: DealFormProps) {
  const router = useRouter();
  const [orgId, setOrgId] = useState(deal?.organizationId ?? "");
  const [contactId, setContactId] = useState(deal?.contactId ?? "");
  const [assignedToId, setAssignedToId] = useState(deal?.assignedToId ?? "");
  const [contacts, setContacts] = useState<ContactOption[]>(initialContacts ?? []);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [freightByClient, setFreightByClient] = useState(deal?.freightByClient ?? false);
  const [cfValues, setCfValues] = useState<Record<string, string>>(fieldValues);

  useEffect(() => {
    if (!orgId) { setContacts([]); setContactId(""); return; }
    setLoadingContacts(true);
    getContactsByOrganization(orgId)
      .then((result) => setContacts(result.map((c) => ({ id: c.id, name: c.name }))))
      .finally(() => setLoadingContacts(false));
  }, [orgId]);

  const handleCfChange = (fieldId: string, value: string) => {
    setCfValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  // Group fields by section
  const fieldsBySection = new Map<string, StageFieldData[]>();
  for (const field of stageFields) {
    const sectionName = field.section || "default";
    if (!fieldsBySection.has(sectionName)) fieldsBySection.set(sectionName, []);
    fieldsBySection.get(sectionName)!.push(field);
  }

  return (
    <form action={action} className="space-y-8">
      {pipelineId && <input type="hidden" name="pipelineId" value={pipelineId} />}
      {pipelineStageId && <input type="hidden" name="pipelineStageId" value={pipelineStageId} />}
      <input type="hidden" name="organizationId" value={orgId} />
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="assignedToId" value={assignedToId} />
      <input type="hidden" name="freightByClient" value={freightByClient ? "true" : "false"} />

      {/* DADOS BÁSICOS */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Dados Básicos
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" name="title" required defaultValue={deal?.title ?? ""} placeholder="Nome do negócio" />
          </div>

          <div className="space-y-2">
            <Label>Etapa</Label>
            <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 text-sm">
              {stageName || "Contato / Captação"}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cliente (Organização)</Label>
            <Select value={orgId} onValueChange={(val) => { setOrgId(val ?? ""); setContactId(""); }}>
              <SelectTrigger className="w-full">
                <span className={orgId ? "" : "text-muted-foreground"}>
                  {orgId ? organizations.find((o) => o.id === orgId)?.name ?? orgId : "Selecione uma organização"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Contato</Label>
            <Select value={contactId} onValueChange={(val) => setContactId(val ?? "")} disabled={!orgId || loadingContacts}>
              <SelectTrigger className="w-full">
                <span className={contactId ? "" : "text-muted-foreground"}>
                  {contactId ? contacts.find((c) => c.id === contactId)?.name ?? contactId
                    : loadingContacts ? "Carregando..." : !orgId ? "Selecione uma organização primeiro" : "Selecione um contato"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Valor (R$)</Label>
            <Input id="value" name="value" type="number" step="0.01" min="0" defaultValue={deal?.value != null ? String(deal.value) : ""} placeholder="0,00" />
          </div>

          {users && users.length > 0 && (
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={assignedToId} onValueChange={(val) => setAssignedToId(val ?? "")}>
                <SelectTrigger className="w-full">
                  <span className={assignedToId ? "" : "text-muted-foreground"}>
                    {assignedToId ? users.find((u) => u.id === assignedToId)?.name ?? assignedToId : "Selecione um responsável"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </fieldset>

      {/* STAGE-SPECIFIC FIELDS */}
      {stageSections.map((section) => {
        const sectionFields = fieldsBySection.get(section.name) || [];
        if (sectionFields.length === 0) return null;
        return (
          <fieldset key={section.id} className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {sectionFields.map((field) => (
                <DynamicField key={field.id} field={field} value={cfValues[field.id] || ""} onChange={handleCfChange} />
              ))}
            </div>
          </fieldset>
        );
      })}

      {/* Fields without sections fallback */}
      {stageFields.length > 0 && stageSections.length === 0 && (
        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Campos da Etapa</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {stageFields.map((field) => (
              <DynamicField key={field.id} field={field} value={cfValues[field.id] || ""} onChange={handleCfChange} />
            ))}
          </div>
        </fieldset>
      )}

      {/* INFORMAÇÕES COMPLEMENTARES */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Informações Complementares
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="decorationTheme">Tema da Decoração</Label>
            <Input id="decorationTheme" name="decorationTheme" defaultValue={deal?.decorationTheme ?? ""} placeholder="Ex: Natal Encantado" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="origin">Origem</Label>
            <Input id="origin" name="origin" defaultValue={deal?.origin ?? ""} placeholder="Ex: Indicação, Site, Prospecção" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" name="address" defaultValue={deal?.address ?? ""} placeholder="Endereço do projeto" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Data de Início</Label>
            <Input id="startDate" name="startDate" type="date" defaultValue={formatDateForInput(deal?.startDate)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expectedCloseDate">Previsão de Fechamento</Label>
            <Input id="expectedCloseDate" name="expectedCloseDate" type="date" defaultValue={formatDateForInput(deal?.expectedCloseDate)} />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox id="freightByClient" checked={freightByClient} onCheckedChange={(checked) => setFreightByClient(checked === true)} />
            <Label htmlFor="freightByClient" className="cursor-pointer">Frete por conta do cliente?</Label>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="freightDescription">Descrição do Frete</Label>
            <Input id="freightDescription" name="freightDescription" defaultValue={deal?.freightDescription ?? ""} placeholder="Detalhes sobre o frete" />
          </div>
        </div>
      </fieldset>

      {/* NOTAS INTERNAS */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notas internas</Label>
        <Textarea id="notes" name="notes" defaultValue={deal?.notes ?? ""} placeholder="Notas internas... Use @nome para mencionar usuários" rows={3} />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit">{deal ? "Salvar Alterações" : "Criar Negócio"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </form>
  );
}
