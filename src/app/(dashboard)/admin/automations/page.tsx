import Link from "next/link";
import { ArrowLeft, Zap, Plus, Pencil } from "lucide-react";
import { getAutomations } from "@/actions/admin";
import { ToggleAutomation } from "./_components/toggle-automation";
import { DeleteAutomation } from "./_components/delete-automation";

const TRIGGER_LABELS: Record<string, string> = {
  ON_CREATE: "Ao criar",
  ON_UPDATE: "Ao atualizar",
  ON_STAGE_CHANGE: "Ao mudar etapa",
  ON_STATUS_CHANGE: "Ao mudar status",
  ON_FIELD_CHANGE: "Ao mudar campo",
  ON_DATE_REACHED: "Ao atingir data",
  SCHEDULED: "Agendado",
};

const ENTITY_LABELS: Record<string, string> = {
  deal: "Negocio",
  client: "Cliente",
  contact: "Contato",
  proposal: "Proposta",
  invoice: "Fatura",
};

const ENTITY_COLORS: Record<string, string> = {
  deal: "bg-teal-500/10 text-teal-400",
  client: "bg-emerald-500/10 text-emerald-400",
  contact: "bg-green-100 text-green-400",
  proposal: "bg-yellow-500/10 text-yellow-400",
  invoice: "bg-red-500/10 text-rose-400",
};

export default async function AutomationsPage() {
  const automations = await getAutomations();

  return (
    <div className="flex min-h-screen flex-col bg-foreground/[0.03]/60">
      {/* Top bar */}
      <div className="border-b border-foreground/[0.08] bg-card px-6 py-4">
        <Link
          href="/admin"
          className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-foreground/50 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Administracao
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Automacoes
            </h1>
            <p className="mt-1 text-sm text-foreground/50">
              Gerencie as automacoes de fluxo de trabalho do sistema.
            </p>
          </div>
          <Link
            href="/admin/automations/new"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Nova Automacao
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {automations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-foreground/10 bg-card px-6 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/[0.04]">
              <Zap className="h-7 w-7 text-foreground/40" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Nenhuma automacao cadastrada
            </h3>
            <p className="mt-1 text-sm text-foreground/50">
              Crie sua primeira automacao para automatizar processos do sistema.
            </p>
            <Link
              href="/admin/automations/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Nova Automacao
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {automations.map((automation) => (
              <div
                key={automation.id}
                className="rounded-xl glass-card p-5 shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                        <Zap className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {automation.name}
                        </h3>
                        {automation.description && (
                          <p className="text-sm text-foreground/50">
                            {automation.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Entity badge */}
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          ENTITY_COLORS[automation.entity] ??
                          "bg-foreground/[0.04] text-foreground/70"
                        }`}
                      >
                        {ENTITY_LABELS[automation.entity] ?? automation.entity}
                      </span>

                      {/* Trigger badge */}
                      <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                        {TRIGGER_LABELS[automation.trigger] ??
                          automation.trigger}
                      </span>

                      {/* Steps count */}
                      <span className="inline-flex items-center rounded-full bg-foreground/[0.04] px-2.5 py-0.5 text-xs font-medium text-foreground/60">
                        {automation.actions.length}{" "}
                        {automation.actions.length === 1 ? "acao" : "acoes"}
                      </span>

                      {/* Status */}
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          automation.isActive
                            ? "bg-green-500/10 text-green-400"
                            : "bg-foreground/[0.04] text-foreground/50"
                        }`}
                      >
                        {automation.isActive ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-3">
                    <ToggleAutomation
                      id={automation.id}
                      isActive={automation.isActive}
                    />
                    <Link
                      href={`/admin/automations/${automation.id}/edit`}
                      className="rounded-lg p-2 text-foreground/40 transition-colors hover:bg-foreground/[0.04] hover:text-foreground/60"
                      title="Editar automacao"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <DeleteAutomation
                      id={automation.id}
                      name={automation.name}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
