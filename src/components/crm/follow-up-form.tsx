"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createFollowUp } from "@/actions/crm";
import { Send } from "lucide-react";

interface FollowUpFormProps {
  dealId: string;
}

export function FollowUpForm({ dealId }: FollowUpFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleAction(formData: FormData) {
    await createFollowUp(formData);
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={handleAction} className="space-y-4">
      <input type="hidden" name="dealId" value={dealId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo *</Label>
          <Select name="type" required defaultValue="">
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CALL">Ligação</SelectItem>
              <SelectItem value="EMAIL">E-mail</SelectItem>
              <SelectItem value="MEETING">Reunião</SelectItem>
              <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              <SelectItem value="NOTE">Nota</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scheduledAt">Agendado para</Label>
          <Input
            id="scheduledAt"
            name="scheduledAt"
            type="datetime-local"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Descreva a atividade..."
          rows={3}
        />
      </div>

      <Button type="submit" size="sm">
        <Send className="h-4 w-4" />
        Adicionar Atividade
      </Button>
    </form>
  );
}
