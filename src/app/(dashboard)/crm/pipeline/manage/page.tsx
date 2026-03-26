import Link from "next/link";
import { getPipelines, createPipeline, deletePipeline } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ManagePipelinesPage() {
  const pipelines = await getPipelines();

  async function handleCreate(formData: FormData) {
    "use server";
    await createPipeline(formData);
    redirect("/crm/pipeline/manage");
  }

  async function handleDelete(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await deletePipeline(id);
    redirect("/crm/pipeline/manage");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/crm/pipeline" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Gerenciar Pipelines
          </h2>
          <p className="text-muted-foreground">
            Crie e gerencie os funis de vendas
          </p>
        </div>
      </div>

      {/* Existing pipelines */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pipelines.map((pipeline) => (
          <Card key={pipeline.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{pipeline.name}</CardTitle>
                <span className="text-sm text-muted-foreground">
                  {pipeline._count.deals} negócio
                  {pipeline._count.deals !== 1 ? "s" : ""}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {pipeline.stages.map((stage) => (
                  <span
                    key={stage.id}
                    className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
                  >
                    {stage.name}
                  </span>
                ))}
              </div>
              {pipeline._count.deals === 0 && (
                <form action={handleDelete}>
                  <input type="hidden" name="id" value={pipeline.id} />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir Pipeline
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create new pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Novo Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleCreate} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="text-sm font-medium leading-none"
              >
                Nome do Pipeline
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Ex: Just 2027"
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label
                htmlFor="stages"
                className="text-sm font-medium leading-none"
              >
                Etapas (separadas por vírgula)
              </label>
              <input
                id="stages"
                name="stages"
                type="text"
                defaultValue="Contato / Captação, Briefing, Projetos, Apresentação, Fechamento"
                className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                As etapas padrão já estão preenchidas. Modifique conforme
                necessário.
              </p>
            </div>
            <Button type="submit">
              <Plus className="h-4 w-4" />
              Criar Pipeline
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
