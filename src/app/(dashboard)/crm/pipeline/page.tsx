import Link from "next/link";
import { getPipelines, getPipelineWithDeals } from "@/actions/crm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

function formatCurrency(value: unknown): string {
  const num = Number(value);
  if (!value || isNaN(num)) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

function daysInStage(updatedAt: Date): number {
  const now = new Date();
  const diff = now.getTime() - new Date(updatedAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string }>;
}) {
  const params = await searchParams;
  const pipelines = await getPipelines();

  if (pipelines.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pipeline</h2>
          <p className="text-muted-foreground">
            Nenhum pipeline criado ainda.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            Crie seu primeiro pipeline para organizar os negócios.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            render={<Link href="/crm/pipeline/manage" />}
          >
            <Plus className="h-4 w-4" />
            Criar Pipeline
          </Button>
        </div>
      </div>
    );
  }

  const activePipelineId = params.pipeline || pipelines[pipelines.length - 1].id;
  const { pipeline, deals } = await getPipelineWithDeals(activePipelineId);

  // Group deals by stage
  const dealsByStage: Record<string, typeof deals> = {};
  for (const stage of pipeline.stages) {
    dealsByStage[stage.id] = deals.filter(
      (d) => d.pipelineStageId === stage.id
    );
  }
  // Deals without a stage
  const unassigned = deals.filter((d) => !d.pipelineStageId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pipeline</h2>
          <p className="text-muted-foreground">
            Visualize o funil de vendas por etapas
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/crm/pipeline/manage" />}
        >
          Gerenciar Pipelines
        </Button>
      </div>

      {/* Pipeline selector tabs */}
      <div className="flex items-center gap-2 border-b pb-2">
        {pipelines.map((p) => (
          <Link
            key={p.id}
            href={`/crm/pipeline?pipeline=${p.id}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              p.id === activePipelineId
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {p.name}
            <span className="ml-1.5 text-xs opacity-70">
              ({p._count.deals})
            </span>
          </Link>
        ))}
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-4">
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${pipeline.stages.length}, minmax(220px, 1fr))`,
          minWidth: `${pipeline.stages.length * 220}px`,
        }}
      >
        {pipeline.stages.map((stage, stageIdx) => {
          const stageDeals = dealsByStage[stage.id] ?? [];
          const total = stageDeals.reduce(
            (sum, deal) => sum + Number(deal.value ?? 0),
            0
          );
          const isFirstStage = stageIdx === 0;

          return (
            <div key={stage.id} className="flex flex-col gap-3">
              <div
                className={`rounded-lg border border-t-4 ${
                  stage.color || "border-t-gray-400"
                } bg-muted/30 p-3`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{stage.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {stageDeals.length}
                  </span>
                </div>
                {total > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(total)}
                  </p>
                )}
              </div>

              {isFirstStage && (
                <Link
                  href={`/crm/deals/new?pipelineId=${activePipelineId}`}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-foreground/10 px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Novo Cliente
                </Link>
              )}

              <div className="flex flex-col gap-2">
                {stageDeals.map((deal) => {
                  const days = daysInStage(deal.updatedAt);
                  return (
                    <Link
                      key={deal.id}
                      href={`/crm/deals/${deal.id}`}
                      className="block"
                    >
                      <Card className="transition-shadow hover:shadow-lg">
                        <CardContent className="p-3 space-y-1">
                          <p className="text-sm font-medium leading-tight">
                            {deal.title}
                          </p>
                          {deal.organization && (
                            <p className="text-xs text-muted-foreground">
                              {deal.organization.name}
                            </p>
                          )}
                          {deal.value && (
                            <p className="text-xs font-medium text-primary">
                              {formatCurrency(deal.value)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {days === 0
                              ? "Hoje"
                              : `${days} dia${days > 1 ? "s" : ""}`}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
                {stageDeals.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Nenhum negócio
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
