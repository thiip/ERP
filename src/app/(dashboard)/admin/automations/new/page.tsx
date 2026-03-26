"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Zap } from "lucide-react";
import { createAutomation } from "@/actions/admin";
import type { AutomationTrigger, AutomationAction } from "@/generated/prisma/client";

const TRIGGER_OPTIONS: { value: AutomationTrigger; label: string }[] = [
  { value: "ON_CREATE", label: "Ao criar" },
  { value: "ON_UPDATE", label: "Ao atualizar" },
  { value: "ON_STAGE_CHANGE", label: "Ao mudar etapa" },
  { value: "ON_STATUS_CHANGE", label: "Ao mudar status" },
  { value: "ON_FIELD_CHANGE", label: "Ao mudar campo" },
  { value: "ON_DATE_REACHED", label: "Ao atingir data" },
  { value: "SCHEDULED", label: "Agendado" },
];

const ACTION_OPTIONS: { value: AutomationAction; label: string }[] = [
  { value: "SEND_EMAIL", label: "Enviar e-mail" },
  { value: "SEND_NOTIFICATION", label: "Enviar notificacao" },
  { value: "CREATE_TASK", label: "Criar tarefa" },
  { value: "UPDATE_FIELD", label: "Atualizar campo" },
  { value: "CREATE_FOLLOW_UP", label: "Criar follow-up" },
  { value: "MOVE_STAGE", label: "Mover etapa" },
  { value: "ASSIGN_USER", label: "Atribuir usuario" },
  { value: "WEBHOOK", label: "Webhook" },
  { value: "CREATE_PROPOSAL", label: "Criar proposta" },
];

const ENTITY_OPTIONS = [
  { value: "deal", label: "Negocio" },
  { value: "client", label: "Cliente" },
  { value: "contact", label: "Contato" },
  { value: "proposal", label: "Proposta" },
  { value: "invoice", label: "Fatura" },
];

interface StepForm {
  action: AutomationAction;
  actionConfig: string;
  delayMinutes: number;
  order: number;
}

export default function NewAutomationPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [entity, setEntity] = useState("deal");
  const [trigger, setTrigger] = useState<AutomationTrigger>("ON_CREATE");
  const [steps, setSteps] = useState<StepForm[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addStep() {
    setSteps((prev) => [
      ...prev,
      {
        action: "SEND_NOTIFICATION" as AutomationAction,
        actionConfig: "",
        delayMinutes: 0,
        order: prev.length + 1,
      },
    ]);
  }

  function removeStep(index: number) {
    setSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }))
    );
  }

  function updateStep(index: number, field: keyof StepForm, value: string | number) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("O nome da automacao e obrigatorio.");
      return;
    }

    setSubmitting(true);
    try {
      await createAutomation({
        name: name.trim(),
        description: description.trim() || undefined,
        entity,
        trigger,
        steps: steps.map((s) => ({
          action: s.action,
          actionConfig: s.actionConfig.trim() || undefined,
          delayMinutes: s.delayMinutes,
          order: s.order,
        })),
      });
      router.push("/admin/automations");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar automacao.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-foreground/[0.03]/60">
      {/* Top bar */}
      <div className="border-b border-foreground/[0.08] bg-card px-6 py-4">
        <Link
          href="/admin/automations"
          className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-foreground/50 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Automacoes
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <Zap className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Nova Automacao
            </h1>
            <p className="mt-0.5 text-sm text-foreground/50">
              Configure uma nova automacao de fluxo de trabalho.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 p-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Basic info card */}
          <div className="rounded-xl glass-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Informacoes Basicas
            </h2>
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-medium text-foreground/70"
                >
                  Nome *
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Notificar ao criar negocio"
                  className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="mb-1.5 block text-sm font-medium text-foreground/70"
                >
                  Descricao
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o objetivo desta automacao..."
                  rows={3}
                  className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Entity + Trigger row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Entity */}
                <div>
                  <label
                    htmlFor="entity"
                    className="mb-1.5 block text-sm font-medium text-foreground/70"
                  >
                    Entidade *
                  </label>
                  <select
                    id="entity"
                    value={entity}
                    onChange={(e) => setEntity(e.target.value)}
                    className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {ENTITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Trigger */}
                <div>
                  <label
                    htmlFor="trigger"
                    className="mb-1.5 block text-sm font-medium text-foreground/70"
                  >
                    Gatilho *
                  </label>
                  <select
                    id="trigger"
                    value={trigger}
                    onChange={(e) =>
                      setTrigger(e.target.value as AutomationTrigger)
                    }
                    className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {TRIGGER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Steps card */}
          <div className="rounded-xl glass-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Acoes ({steps.length})
              </h2>
              <button
                type="button"
                onClick={addStep}
                className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/10 bg-card px-3 py-1.5 text-sm font-medium text-foreground/70 shadow-sm transition-colors hover:bg-foreground/[0.03]"
              >
                <Plus className="h-4 w-4" />
                Adicionar Acao
              </button>
            </div>

            {steps.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-foreground/[0.08] px-6 py-10 text-center">
                <p className="text-sm text-foreground/50">
                  Nenhuma acao adicionada. Clique em &quot;Adicionar Acao&quot;
                  para configurar o que esta automacao deve fazer.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-foreground/[0.08] bg-foreground/[0.03] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground/70">
                        Acao #{step.order}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="rounded p-1 text-foreground/40 transition-colors hover:bg-red-500/10 hover:text-red-600"
                        title="Remover acao"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {/* Action type + delay row */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-foreground/60">
                            Tipo de Acao
                          </label>
                          <select
                            value={step.action}
                            onChange={(e) =>
                              updateStep(index, "action", e.target.value)
                            }
                            className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            {ACTION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-foreground/60">
                            Atraso (minutos)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={step.delayMinutes}
                            onChange={(e) =>
                              updateStep(
                                index,
                                "delayMinutes",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-full rounded-lg border border-foreground/10 px-3 py-2 text-sm shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Action config */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-foreground/60">
                          Configuracao (JSON)
                        </label>
                        <textarea
                          value={step.actionConfig}
                          onChange={(e) =>
                            updateStep(index, "actionConfig", e.target.value)
                          }
                          placeholder='{"to": "email@example.com", "subject": "..."}'
                          rows={3}
                          className="w-full rounded-lg border border-foreground/10 px-3 py-2 font-mono text-xs shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/admin/automations"
              className="rounded-lg border border-foreground/10 bg-card px-4 py-2.5 text-sm font-medium text-foreground/70 shadow-sm transition-colors hover:bg-foreground/[0.03]"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "Criando..." : "Criar Automacao"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
