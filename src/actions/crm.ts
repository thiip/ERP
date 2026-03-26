"use server";

import { prisma } from "@/lib/prisma";
import { getActiveCompanyId, getSessionUser } from "@/lib/company-context";
import { revalidatePath } from "next/cache";
import type {
  Segment,
  ContactOrigin,
  OrganizationStatus,
  DealStage,
  FollowUpType,
  ProposalStatus,
} from "@/generated/prisma/client";
import { createMentionNotifications } from "./notifications";

// ---------------------------------------------------------------------------
// Organizations (Empresas)
// ---------------------------------------------------------------------------

export async function getOrganizations(filters?: {
  segment?: Segment;
  status?: OrganizationStatus;
  search?: string;
}) {
  const companyId = await getActiveCompanyId();

  return prisma.organization.findMany({
    where: {
      companyId,
      ...(filters?.segment && { segment: filters.segment }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" as const } },
          { cnpj: { contains: filters.search } },
          { city: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }),
    },
    include: {
      responsible: { select: { id: true, name: true } },
      _count: { select: { contacts: true, deals: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getOrganization(id: string) {
  const companyId = await getActiveCompanyId();

  const org = await prisma.organization.findFirst({
    where: { id, companyId },
    include: {
      responsible: { select: { id: true, name: true } },
      contacts: { orderBy: { name: "asc" } },
      deals: {
        orderBy: { createdAt: "desc" },
        include: { contact: true, assignedTo: { select: { id: true, name: true } } },
      },
      proposals: {
        orderBy: { createdAt: "desc" },
        include: { deal: { select: { title: true } } },
      },
      contracts: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!org) throw new Error("Empresa não encontrada");
  return org;
}

export async function createOrganization(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const name = formData.get("name") as string;
  if (!name) throw new Error("Nome é obrigatório");

  const org = await prisma.organization.create({
    data: {
      companyId,
      name,
      legalName: (formData.get("legalName") as string) || null,
      cnpj: (formData.get("cnpj") as string) || null,
      segment: (formData.get("segment") as Segment) || "OUTRO",
      origin: (formData.get("origin") as ContactOrigin) || "OUTRO",
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      website: (formData.get("website") as string) || null,
      address: (formData.get("address") as string) || null,
      neighborhood: (formData.get("neighborhood") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      zipCode: (formData.get("zipCode") as string) || null,
      responsibleUserId: (formData.get("responsibleUserId") as string) || null,
      status: (formData.get("status") as OrganizationStatus) || "PROSPECT",
      notes: (formData.get("notes") as string) || null,
    },
  });

  revalidatePath("/crm");
  return org;
}

export async function updateOrganization(id: string, formData: FormData) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.organization.findFirst({ where: { id, companyId } });
  if (!existing) throw new Error("Empresa não encontrada");

  const name = formData.get("name") as string;
  if (!name) throw new Error("Nome é obrigatório");

  const org = await prisma.organization.update({
    where: { id },
    data: {
      name,
      legalName: (formData.get("legalName") as string) || null,
      cnpj: (formData.get("cnpj") as string) || null,
      segment: (formData.get("segment") as Segment) || existing.segment,
      origin: (formData.get("origin") as ContactOrigin) || existing.origin,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      website: (formData.get("website") as string) || null,
      address: (formData.get("address") as string) || null,
      neighborhood: (formData.get("neighborhood") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      zipCode: (formData.get("zipCode") as string) || null,
      responsibleUserId: (formData.get("responsibleUserId") as string) || null,
      status: (formData.get("status") as OrganizationStatus) || existing.status,
      notes: (formData.get("notes") as string) || null,
      lastContactDate: new Date(),
    },
  });

  revalidatePath("/crm");
  return org;
}

export async function deleteOrganization(id: string) {
  const companyId = await getActiveCompanyId();
  const existing = await prisma.organization.findFirst({ where: { id, companyId } });
  if (!existing) throw new Error("Empresa não encontrada");

  await prisma.organization.delete({ where: { id } });
  revalidatePath("/crm");
}

// ---------------------------------------------------------------------------
// Contacts (Contatos / Pessoas)
// ---------------------------------------------------------------------------

export async function getContacts(filters?: { isPF?: boolean; search?: string }) {
  const companyId = await getActiveCompanyId();

  return prisma.contact.findMany({
    where: {
      companies: { some: { companyId } },
      ...(filters?.isPF !== undefined && { isPF: filters.isPF }),
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" as const } },
          { email: { contains: filters.search, mode: "insensitive" as const } },
          { phone: { contains: filters.search } },
        ],
      }),
    },
    include: {
      organization: { select: { id: true, name: true } },
      companies: { include: { company: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getContactsByOrganization(organizationId: string) {
  const companyId = await getActiveCompanyId();

  // Verify organization belongs to the active company
  const org = await prisma.organization.findFirst({
    where: { id: organizationId, companyId },
  });
  if (!org) return [];

  return prisma.contact.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });
}

export async function getContact(id: string) {
  const companyId = await getActiveCompanyId();

  const contact = await prisma.contact.findFirst({
    where: { id, companies: { some: { companyId } } },
    include: {
      organization: true,
      companies: { include: { company: true } },
      deals: {
        where: { companyId },
        orderBy: { createdAt: "desc" },
        include: { organization: { select: { name: true } } },
      },
    },
  });

  if (!contact) throw new Error("Contato não encontrado");
  return contact;
}

export async function createContact(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const name = formData.get("name") as string;
  if (!name) throw new Error("Nome é obrigatório");

  const contact = await prisma.contact.create({
    data: {
      name,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      position: (formData.get("position") as string) || null,
      organizationId: (formData.get("organizationId") as string) || null,
      isPF: formData.get("isPF") === "true",
      cpf: (formData.get("cpf") as string) || null,
      notes: (formData.get("notes") as string) || null,
      companies: { create: { companyId } },
    },
    include: { organization: true },
  });

  revalidatePath("/crm");
  return contact;
}

export async function updateContact(id: string, formData: FormData) {
  const companyId = await getActiveCompanyId();
  const existing = await prisma.contact.findFirst({
    where: { id, companies: { some: { companyId } } },
  });
  if (!existing) throw new Error("Contato não encontrado");

  const name = formData.get("name") as string;
  if (!name) throw new Error("Nome é obrigatório");

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      name,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      position: (formData.get("position") as string) || null,
      organizationId: (formData.get("organizationId") as string) || null,
      isPF: formData.get("isPF") === "true",
      cpf: (formData.get("cpf") as string) || null,
      notes: (formData.get("notes") as string) || null,
    },
    include: { organization: true },
  });

  revalidatePath("/crm");
  return contact;
}

export async function deleteContact(id: string) {
  const companyId = await getActiveCompanyId();
  const existing = await prisma.contact.findFirst({
    where: { id, companies: { some: { companyId } } },
  });
  if (!existing) throw new Error("Contato não encontrado");

  await prisma.contact.delete({ where: { id } });
  revalidatePath("/crm");
}

// ---------------------------------------------------------------------------
// Deals (Negócios / Projetos)
// ---------------------------------------------------------------------------

const DEAL_STAGES: DealStage[] = [
  "CONTACT_CAPTURE",
  "BRIEFING",
  "PROJECT",
  "PRESENTATION",
  "CLOSING",
  "CLOSED_WON",
  "CLOSED_LOST",
];

export async function getDeals() {
  const companyId = await getActiveCompanyId();

  return prisma.deal.findMany({
    where: { companyId },
    include: {
      organization: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDealsByStage() {
  const companyId = await getActiveCompanyId();

  const deals = await prisma.deal.findMany({
    where: { companyId },
    include: {
      organization: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const grouped = Object.fromEntries(
    DEAL_STAGES.map((stage) => [stage, deals.filter((d) => d.stage === stage)])
  ) as Record<DealStage, typeof deals>;

  return grouped;
}

export async function getDeal(id: string) {
  const companyId = await getActiveCompanyId();

  const deal = await prisma.deal.findFirst({
    where: { id, companyId },
    include: {
      organization: true,
      contact: true,
      assignedTo: { select: { id: true, name: true } },
      followUps: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      proposals: {
        include: { items: true },
        orderBy: { createdAt: "desc" },
      },
      contracts: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      pipeline: { select: { id: true, name: true } },
      pipelineStage: { select: { id: true, name: true } },
    },
  });

  if (!deal) throw new Error("Negócio não encontrado");
  return deal;
}

export async function createDeal(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const user = await getSessionUser();

  const title = formData.get("title") as string;
  if (!title) throw new Error("Título é obrigatório");

  const valueStr = formData.get("value") as string | null;
  const budgetStr = formData.get("budget") as string | null;
  const expectedCloseDateStr = formData.get("expectedCloseDate") as string | null;

  const startDateStr = formData.get("startDate") as string | null;

  const pipelineId = (formData.get("pipelineId") as string) || null;

  // Force new deals to start at stage 1 of the pipeline
  let pipelineStageId: string | null = null;
  if (pipelineId) {
    const firstStage = await prisma.pipelineStage.findFirst({
      where: { pipelineId },
      orderBy: { order: "asc" },
    });
    pipelineStageId = firstStage?.id || null;
  }

  const deal = await prisma.deal.create({
    data: {
      companyId,
      title,
      organizationId: (formData.get("organizationId") as string) || null,
      contactId: (formData.get("contactId") as string) || null,
      value: valueStr ? parseFloat(valueStr) : null,
      stage: "CONTACT_CAPTURE",
      pipelineId,
      pipelineStageId,
      probability: formData.get("probability") ? parseInt(formData.get("probability") as string, 10) : null,
      expectedCloseDate: expectedCloseDateStr ? new Date(expectedCloseDateStr) : null,
      assignedToId: (formData.get("assignedToId") as string) || user.id,
      budget: budgetStr ? parseFloat(budgetStr) : null,
      decorationTheme: (formData.get("decorationTheme") as string) || null,
      considerations: (formData.get("considerations") as string) || null,
      notes: (formData.get("notes") as string) || null,
      address: (formData.get("address") as string) || null,
      freightByClient: formData.get("freightByClient") === "true",
      freightDescription: (formData.get("freightDescription") as string) || null,
      origin: (formData.get("origin") as string) || null,
      startDate: startDateStr ? new Date(startDateStr) : null,
    },
    include: {
      organization: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
    },
  });

  // Save custom field values (prefix cf_)
  const cfValues: { fieldId: string; value: string }[] = [];
  for (const [key, val] of formData.entries()) {
    if (key.startsWith("cf_") && typeof val === "string") {
      cfValues.push({ fieldId: key.slice(3), value: val });
    }
  }
  if (cfValues.length > 0) {
    await saveDealFieldValues(deal.id, cfValues);
  }

  // Check for @mentions in notes
  const notes = (formData.get("notes") as string) || "";
  if (notes) {
    await createMentionNotifications(notes, `/crm/deals/${deal.id}`, `negocio "${deal.title}"`);
  }

  revalidatePath("/crm");
  return deal;
}

export async function updateDeal(id: string, formData: FormData) {
  const companyId = await getActiveCompanyId();
  const existing = await prisma.deal.findFirst({ where: { id, companyId } });
  if (!existing) throw new Error("Negócio não encontrado");

  const title = formData.get("title") as string;
  if (!title) throw new Error("Título é obrigatório");

  const valueStr = formData.get("value") as string | null;
  const budgetStr = formData.get("budget") as string | null;
  const expectedCloseDateStr = formData.get("expectedCloseDate") as string | null;

  const startDateStr = formData.get("startDate") as string | null;

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      title,
      organizationId: (formData.get("organizationId") as string) || null,
      contactId: (formData.get("contactId") as string) || null,
      value: valueStr ? parseFloat(valueStr) : null,
      // Don't allow stage changes via form — use advanceDealStage
      probability: formData.get("probability") ? parseInt(formData.get("probability") as string, 10) : null,
      expectedCloseDate: expectedCloseDateStr ? new Date(expectedCloseDateStr) : null,
      assignedToId: (formData.get("assignedToId") as string) || null,
      budget: budgetStr ? parseFloat(budgetStr) : null,
      decorationTheme: (formData.get("decorationTheme") as string) || null,
      considerations: (formData.get("considerations") as string) || null,
      notes: (formData.get("notes") as string) || null,
      address: (formData.get("address") as string) || null,
      freightByClient: formData.get("freightByClient") === "true",
      freightDescription: (formData.get("freightDescription") as string) || null,
      origin: (formData.get("origin") as string) || null,
      startDate: startDateStr ? new Date(startDateStr) : null,
    },
    include: {
      organization: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
    },
  });

  // Save custom field values (prefix cf_)
  const cfValues: { fieldId: string; value: string }[] = [];
  for (const [key, val] of formData.entries()) {
    if (key.startsWith("cf_") && typeof val === "string") {
      cfValues.push({ fieldId: key.slice(3), value: val });
    }
  }
  if (cfValues.length > 0) {
    await saveDealFieldValues(deal.id, cfValues);
  }

  // Check for @mentions in notes
  const updatedNotes = (formData.get("notes") as string) || "";
  if (updatedNotes) {
    await createMentionNotifications(updatedNotes, `/crm/deals/${deal.id}`, `negocio "${deal.title}"`);
  }

  revalidatePath("/crm");
  return deal;
}

export async function updateDealStage(id: string, stage: DealStage) {
  const companyId = await getActiveCompanyId();
  const existing = await prisma.deal.findFirst({ where: { id, companyId } });
  if (!existing) throw new Error("Negócio não encontrado");

  const deal = await prisma.deal.update({
    where: { id },
    data: { stage },
    include: {
      organization: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
    },
  });

  revalidatePath("/crm");
  return deal;
}

export async function deleteDeal(id: string) {
  const companyId = await getActiveCompanyId();
  const existing = await prisma.deal.findFirst({ where: { id, companyId } });
  if (!existing) throw new Error("Negócio não encontrado");

  await prisma.deal.delete({ where: { id } });
  revalidatePath("/crm");
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

export async function createFollowUp(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const user = await getSessionUser();

  const dealId = formData.get("dealId") as string;
  const type = formData.get("type") as FollowUpType;
  if (!dealId) throw new Error("Negócio é obrigatório");
  if (!type) throw new Error("Tipo é obrigatório");

  const deal = await prisma.deal.findFirst({ where: { id: dealId, companyId } });
  if (!deal) throw new Error("Negócio não encontrado");

  const scheduledAtStr = formData.get("scheduledAt") as string | null;

  const description = (formData.get("description") as string) || null;

  const followUp = await prisma.followUp.create({
    data: {
      dealId,
      userId: user.id,
      type,
      description,
      scheduledAt: scheduledAtStr ? new Date(scheduledAtStr) : null,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  // Check for @mentions in description
  if (description) {
    await createMentionNotifications(description, `/crm/deals/${dealId}`, "um follow-up");
  }

  revalidatePath("/crm");
  return followUp;
}

export async function completeFollowUp(id: string) {
  const companyId = await getActiveCompanyId();
  const followUp = await prisma.followUp.findFirst({
    where: { id, deal: { companyId } },
  });
  if (!followUp) throw new Error("Follow-up não encontrado");

  const updated = await prisma.followUp.update({
    where: { id },
    data: { completedAt: new Date() },
    include: { user: { select: { id: true, name: true } } },
  });

  revalidatePath("/crm");
  return updated;
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

export async function getProposals(statusFilter?: ProposalStatus) {
  const companyId = await getActiveCompanyId();

  return prisma.proposal.findMany({
    where: {
      companyId,
      ...(statusFilter && { status: statusFilter }),
    },
    include: {
      deal: { select: { title: true } },
      organization: { select: { name: true } },
      items: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProposalsByStatus() {
  const companyId = await getActiveCompanyId();

  const proposals = await prisma.proposal.findMany({
    where: { companyId },
    include: {
      deal: { select: { title: true } },
      organization: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    open: proposals.filter((p) => p.status === "DRAFT" || p.status === "SENT"),
    won: proposals.filter((p) => p.status === "ACCEPTED"),
    lost: proposals.filter((p) => p.status === "REJECTED"),
  };
}

// ---------------------------------------------------------------------------
// Pipelines
// ---------------------------------------------------------------------------

export async function getPipelines() {
  const companyId = await getActiveCompanyId();

  return prisma.pipeline.findMany({
    where: { companyId },
    include: {
      stages: { orderBy: { order: "asc" } },
      _count: { select: { deals: true } },
    },
    orderBy: { order: "asc" },
  });
}

export async function getPipelineWithDeals(pipelineId: string) {
  const companyId = await getActiveCompanyId();

  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, companyId },
    include: {
      stages: { orderBy: { order: "asc" } },
    },
  });

  if (!pipeline) throw new Error("Pipeline não encontrado");

  const deals = await prisma.deal.findMany({
    where: { companyId, pipelineId },
    include: {
      organization: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      pipelineStage: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return { pipeline, deals };
}

export async function createPipeline(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const name = formData.get("name") as string;
  if (!name) throw new Error("Nome é obrigatório");

  const stagesStr = formData.get("stages") as string;
  const stageNames = stagesStr
    ? stagesStr.split(",").map((s) => s.trim()).filter(Boolean)
    : ["Contato / Captação", "Briefing", "Projetos", "Apresentação", "Fechamento"];

  const maxOrder = await prisma.pipeline.count({ where: { companyId } });

  const pipeline = await prisma.pipeline.create({
    data: {
      companyId,
      name,
      order: maxOrder,
      stages: {
        create: stageNames.map((stageName, i) => ({
          name: stageName,
          order: i,
        })),
      },
    },
    include: { stages: true },
  });

  revalidatePath("/crm");
  return pipeline;
}

export async function updatePipeline(id: string, formData: FormData) {
  const companyId = await getActiveCompanyId();
  const existing = await prisma.pipeline.findFirst({ where: { id, companyId } });
  if (!existing) throw new Error("Pipeline não encontrado");

  const name = formData.get("name") as string;
  if (!name) throw new Error("Nome é obrigatório");

  const pipeline = await prisma.pipeline.update({
    where: { id },
    data: { name },
  });

  revalidatePath("/crm");
  return pipeline;
}

export async function deletePipeline(id: string) {
  const companyId = await getActiveCompanyId();
  const existing = await prisma.pipeline.findFirst({
    where: { id, companyId },
    include: { _count: { select: { deals: true } } },
  });
  if (!existing) throw new Error("Pipeline não encontrado");
  if (existing._count.deals > 0) {
    throw new Error("Não é possível excluir pipeline com negócios vinculados");
  }

  await prisma.pipeline.delete({ where: { id } });
  revalidatePath("/crm");
}

export async function moveDealToStage(dealId: string, targetStageId: string) {
  const companyId = await getActiveCompanyId();
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, companyId },
    include: {
      pipelineStage: true,
      pipeline: { include: { stages: { orderBy: { order: "asc" } } } },
    },
  });
  if (!deal) throw new Error("Negócio não encontrado");

  const targetStage = await prisma.pipelineStage.findUnique({ where: { id: targetStageId } });
  if (!targetStage) throw new Error("Etapa não encontrada");

  const currentOrder = deal.pipelineStage?.order ?? -1;
  const targetOrder = targetStage.order;

  // Allow moving backward freely
  if (targetOrder <= currentOrder) {
    await prisma.deal.update({
      where: { id: dealId },
      data: { pipelineStageId: targetStageId },
    });
    revalidatePath("/crm");
    return { success: true };
  }

  // Cannot skip stages (only advance 1 at a time)
  if (targetOrder > currentOrder + 1) {
    return {
      success: false,
      error: "Não é possível pular etapas. Complete a etapa atual primeiro.",
    };
  }

  // Advancing 1 stage — validate required fields
  if (deal.pipelineStageId) {
    const validation = await validateStageCompletion(dealId);
    if (!validation.complete) {
      return {
        success: false,
        error: `Campos obrigatórios não preenchidos: ${validation.missingFields.join(", ")}`,
        missingFields: validation.missingFields,
      };
    }
  }

  await prisma.deal.update({
    where: { id: dealId },
    data: { pipelineStageId: targetStageId },
  });

  revalidatePath("/crm");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Company Users
// ---------------------------------------------------------------------------

export async function getCompanyUsers() {
  const companyId = await getActiveCompanyId();
  const accesses = await prisma.userCompanyAccess.findMany({
    where: { companyId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return accesses.map((a) => a.user);
}

// ---------------------------------------------------------------------------
// Deal Documents
// ---------------------------------------------------------------------------

export async function deleteDealDocument(documentId: string) {
  const companyId = await getActiveCompanyId();
  const doc = await prisma.dealDocument.findUnique({
    where: { id: documentId },
    include: { deal: { select: { companyId: true } } },
  });
  if (!doc || doc.deal.companyId !== companyId) {
    throw new Error("Documento não encontrado");
  }

  await prisma.dealDocument.delete({ where: { id: documentId } });
  revalidatePath("/crm");
}

export async function advanceDealStage(dealId: string) {
  const companyId = await getActiveCompanyId();
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, companyId },
    include: {
      pipelineStage: true,
      pipeline: { include: { stages: { orderBy: { order: "asc" } } } },
    },
  });
  if (!deal) throw new Error("Negócio não encontrado");

  if (!deal.pipeline || !deal.pipelineStage) {
    throw new Error("Negócio não está vinculado a um pipeline");
  }

  // Validate required fields for current stage
  const validation = await validateStageCompletion(dealId);
  if (!validation.complete) {
    return {
      success: false,
      error: `Campos obrigatórios não preenchidos: ${validation.missingFields.join(", ")}`,
      missingFields: validation.missingFields,
    };
  }

  const stages = deal.pipeline.stages;
  const currentIdx = stages.findIndex((s) => s.id === deal.pipelineStageId);
  if (currentIdx < 0 || currentIdx >= stages.length - 1) {
    return { success: false, error: "Já está na última etapa" };
  }

  const nextStage = stages[currentIdx + 1];
  await prisma.deal.update({
    where: { id: dealId },
    data: { pipelineStageId: nextStage.id },
  });

  // Also advance the legacy DealStage enum
  const stageOrder: DealStage[] = [
    "CONTACT_CAPTURE", "BRIEFING", "PROJECT", "PRESENTATION", "CLOSING", "CLOSED_WON",
  ];
  const currentEnumIdx = stageOrder.indexOf(deal.stage);
  if (currentEnumIdx >= 0 && currentEnumIdx < stageOrder.length - 1) {
    await prisma.deal.update({
      where: { id: dealId },
      data: { stage: stageOrder[currentEnumIdx + 1] },
    });
  }

  revalidatePath("/crm");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Stage Fields & Validation
// ---------------------------------------------------------------------------

export async function getStageFields(pipelineStageId: string) {
  const sections = await prisma.formSection.findMany({
    where: { pipelineStageId, entity: "deal" },
    orderBy: { order: "asc" },
  });

  const fields = await prisma.customField.findMany({
    where: { pipelineStageId, entity: "deal" },
    orderBy: { order: "asc" },
  });

  return { sections, fields };
}

export async function getDealFieldValues(dealId: string) {
  const values = await prisma.customFieldValue.findMany({
    where: { entityId: dealId },
    include: { customField: true },
  });
  // Return as a map: customFieldId -> value
  const map: Record<string, string> = {};
  for (const v of values) {
    map[v.customFieldId] = v.value;
  }
  return map;
}

export async function saveDealFieldValues(
  dealId: string,
  values: { fieldId: string; value: string }[]
) {
  const companyId = await getActiveCompanyId();
  const deal = await prisma.deal.findFirst({ where: { id: dealId, companyId } });
  if (!deal) throw new Error("Negócio não encontrado");

  for (const { fieldId, value } of values) {
    if (value && value.trim()) {
      await prisma.customFieldValue.upsert({
        where: { customFieldId_entityId: { customFieldId: fieldId, entityId: dealId } },
        create: { customFieldId: fieldId, entityId: dealId, value: value.trim() },
        update: { value: value.trim() },
      });
    } else {
      // Delete empty values
      await prisma.customFieldValue.deleteMany({
        where: { customFieldId: fieldId, entityId: dealId },
      });
    }
  }

  revalidatePath("/crm");
}

export async function validateStageCompletion(_dealId: string) {
  // Mandatory field validation disabled — all stages are optional
  return { complete: true, missingFields: [] as string[] };
}

export async function closeDeal(dealId: string, status: "WON" | "LOST", lossReason?: string) {
  const companyId = await getActiveCompanyId();
  const deal = await prisma.deal.findFirst({ where: { id: dealId, companyId } });
  if (!deal) throw new Error("Negócio não encontrado");

  await prisma.deal.update({
    where: { id: dealId },
    data: {
      closedStatus: status,
      closedAt: new Date(),
      lossReason: status === "LOST" ? (lossReason || null) : null,
      stage: status === "WON" ? "CLOSED_WON" : "CLOSED_LOST",
    },
  });

  revalidatePath("/crm");
  return { success: true };
}
