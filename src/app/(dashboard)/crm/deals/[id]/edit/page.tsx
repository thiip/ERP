import { getDeal, getOrganizations, getCompanyUsers, updateDeal, getContactsByOrganization, getStageFields, getDealFieldValues } from "@/actions/crm";
import { redirect } from "next/navigation";
import { DealForm } from "@/components/crm/deal-form";
import { StageDocuments, hasStageDocuments } from "@/components/crm/stage-documents";

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [deal, organizations, users] = await Promise.all([
    getDeal(id),
    getOrganizations(),
    getCompanyUsers(),
  ]);

  const contacts = deal.organizationId
    ? await getContactsByOrganization(deal.organizationId)
    : [];

  // Fetch stage fields and values
  let stageFields: any[] = [];
  let stageSections: any[] = [];
  let fieldValues: Record<string, string> = {};

  if (deal.pipelineStageId) {
    const [sf, fv] = await Promise.all([
      getStageFields(deal.pipelineStageId),
      getDealFieldValues(deal.id),
    ]);
    stageFields = sf.fields;
    stageSections = sf.sections;
    fieldValues = fv;
  }

  async function handleUpdate(formData: FormData) {
    "use server";
    await updateDeal(id, formData);
    redirect(`/crm/deals/${id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Editar Negócio</h2>
        <p className="text-muted-foreground">
          {deal.title}
        </p>
      </div>
      <DealForm
        deal={{
          id: deal.id,
          title: deal.title,
          organizationId: deal.organizationId,
          contactId: deal.contactId,
          value: deal.value ? Number(deal.value) : null,
          stage: deal.stage,
          budget: deal.budget ? Number(deal.budget) : null,
          decorationTheme: deal.decorationTheme,
          considerations: deal.considerations,
          notes: deal.notes,
          address: deal.address,
          freightByClient: deal.freightByClient,
          freightDescription: deal.freightDescription,
          origin: deal.origin,
          startDate: deal.startDate,
          assignedToId: deal.assignedToId,
          expectedCloseDate: deal.expectedCloseDate,
        }}
        action={handleUpdate}
        organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
        contacts={contacts.map((c) => ({ id: c.id, name: c.name }))}
        users={users.map((u) => ({ id: u.id, name: u.name }))}
        stageFields={stageFields}
        stageSections={stageSections}
        fieldValues={fieldValues}
        stageName={deal.pipelineStage?.name}
      />

      {/* Stage-specific document uploads */}
      {deal.pipelineStage?.name && hasStageDocuments(deal.pipelineStage.name) && (
        <StageDocuments
          stageName={deal.pipelineStage.name}
          dealId={deal.id}
          documents={deal.documents?.map((d: any) => ({
            id: d.id,
            name: d.name,
            category: d.category,
            url: d.url,
            size: d.size,
          })) || []}
        />
      )}
    </div>
  );
}
