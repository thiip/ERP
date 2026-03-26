import { createDeal, getOrganizations, getCompanyUsers, getStageFields } from "@/actions/crm";
import { redirect } from "next/navigation";
import { DealForm } from "@/components/crm/deal-form";
import { prisma } from "@/lib/prisma";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ pipelineId?: string; stageId?: string }>;
}) {
  const params = await searchParams;
  const organizations = await getOrganizations();
  const users = await getCompanyUsers();

  const pipelineId = params.pipelineId || "";

  // Find first stage of the pipeline (new deals always start at stage 1)
  let firstStageId = "";
  let stageName = "Contato / Captação";
  let stageFields: any[] = [];
  let stageSections: any[] = [];

  if (pipelineId) {
    const firstStage = await prisma.pipelineStage.findFirst({
      where: { pipelineId },
      orderBy: { order: "asc" },
    });
    if (firstStage) {
      firstStageId = firstStage.id;
      stageName = firstStage.name;
      const sf = await getStageFields(firstStage.id);
      stageFields = sf.fields;
      stageSections = sf.sections;
    }
  }

  async function handleCreate(formData: FormData) {
    "use server";
    const deal = await createDeal(formData);
    const pid = formData.get("pipelineId") as string;
    if (pid) {
      redirect(`/crm/pipeline?pipeline=${pid}`);
    }
    redirect(`/crm/deals/${deal.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Novo Negócio</h2>
        <p className="text-muted-foreground">
          Preencha os dados para criar um novo negócio
        </p>
      </div>
      <DealForm
        action={handleCreate}
        organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
        users={users}
        pipelineId={pipelineId}
        pipelineStageId={firstStageId}
        stageFields={stageFields}
        stageSections={stageSections}
        stageName={stageName}
      />
    </div>
  );
}
