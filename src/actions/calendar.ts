"use server";

import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";

export type CalendarEventType =
  | "followup"
  | "invoice_due"
  | "contract_start"
  | "contract_end"
  | "production_requested"
  | "deal_expected_close"
  | "proposal_valid_until";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  description?: string;
  date: string; // ISO string
  color: string;
  href?: string;
  metadata?: Record<string, string>;
}

export async function getCalendarEvents(params: {
  start: string;
  end: string;
}): Promise<CalendarEvent[]> {
  const companyId = await getActiveCompanyId();
  const startDate = new Date(params.start);
  const endDate = new Date(params.end);

  const events: CalendarEvent[] = [];

  // 1. Follow-ups (from CRM deals)
  const followUps = await prisma.followUp.findMany({
    where: {
      deal: { companyId },
      scheduledAt: { gte: startDate, lte: endDate },
    },
    include: {
      deal: { select: { id: true, title: true } },
      user: { select: { name: true } },
    },
  });

  for (const fu of followUps) {
    if (!fu.scheduledAt) continue;
    const typeLabels: Record<string, string> = {
      CALL: "Ligação",
      EMAIL: "E-mail",
      MEETING: "Reunião",
      WHATSAPP: "WhatsApp",
      NOTE: "Nota",
    };
    events.push({
      id: fu.id,
      type: "followup",
      title: `${typeLabels[fu.type] ?? fu.type}: ${fu.deal.title}`,
      description: fu.description ?? undefined,
      date: fu.scheduledAt.toISOString(),
      color: "bg-blue-500",
      href: `/crm/pipeline`,
      metadata: {
        dealTitle: fu.deal.title,
        assignedTo: fu.user.name ?? "",
        completed: fu.completedAt ? "Sim" : "Não",
      },
    });
  }

  // 2. Invoices (due dates)
  const invoices = await prisma.invoice.findMany({
    where: {
      companyId,
      dueDate: { gte: startDate, lte: endDate },
    },
    include: {
      organization: { select: { name: true } },
    },
  });

  for (const inv of invoices) {
    const typeLabel = inv.type === "RECEIVABLE" ? "Receber" : "Pagar";
    const statusColors: Record<string, string> = {
      DRAFT: "bg-gray-500",
      ISSUED: "bg-amber-500",
      PAID: "bg-green-500",
      OVERDUE: "bg-red-500",
      CANCELLED: "bg-gray-400",
    };
    events.push({
      id: inv.id,
      type: "invoice_due",
      title: `Fatura #${inv.number} - ${typeLabel}`,
      description: `R$ ${Number(inv.totalValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}${inv.organization ? ` • ${inv.organization.name}` : ""}`,
      date: inv.dueDate.toISOString(),
      color: statusColors[inv.status] ?? "bg-amber-500",
      href: `/erp/invoices`,
      metadata: {
        status: inv.status,
        value: Number(inv.totalValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
      },
    });
  }

  // 3. Contracts (start and end dates)
  const contracts = await prisma.contract.findMany({
    where: {
      companyId,
      OR: [
        { startDate: { gte: startDate, lte: endDate } },
        { endDate: { gte: startDate, lte: endDate } },
      ],
    },
    include: {
      organization: { select: { name: true } },
    },
  });

  for (const contract of contracts) {
    if (contract.startDate >= startDate && contract.startDate <= endDate) {
      events.push({
        id: `${contract.id}-start`,
        type: "contract_start",
        title: `Início: ${contract.title}`,
        description: contract.organization?.name ?? undefined,
        date: contract.startDate.toISOString(),
        color: "bg-emerald-500",
        href: `/erp/contracts`,
        metadata: {
          number: contract.number,
          value: Number(contract.totalValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
        },
      });
    }
    if (contract.endDate >= startDate && contract.endDate <= endDate) {
      events.push({
        id: `${contract.id}-end`,
        type: "contract_end",
        title: `Fim: ${contract.title}`,
        description: contract.organization?.name ?? undefined,
        date: contract.endDate.toISOString(),
        color: "bg-orange-500",
        href: `/erp/contracts`,
        metadata: {
          number: contract.number,
          value: Number(contract.totalValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
        },
      });
    }
  }

  // 4. Production Orders
  const productionOrders = await prisma.productionOrder.findMany({
    where: {
      companyId,
      requestedAt: { gte: startDate, lte: endDate },
    },
  });

  for (const po of productionOrders) {
    events.push({
      id: po.id,
      type: "production_requested",
      title: `OP #${po.orderNumber}: ${po.title}`,
      description: po.description ?? undefined,
      date: po.requestedAt.toISOString(),
      color: "bg-purple-500",
      href: `/production`,
      metadata: {
        status: po.status,
        priority: String(po.priority),
      },
    });
  }

  // 5. Deals (expected close date)
  const deals = await prisma.deal.findMany({
    where: {
      companyId,
      expectedCloseDate: { gte: startDate, lte: endDate },
      closedAt: null,
    },
    include: {
      organization: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
  });

  for (const deal of deals) {
    if (!deal.expectedCloseDate) continue;
    events.push({
      id: deal.id,
      type: "deal_expected_close",
      title: `Previsão: ${deal.title}`,
      description: deal.organization?.name ?? undefined,
      date: deal.expectedCloseDate.toISOString(),
      color: "bg-cyan-500",
      href: `/crm/pipeline`,
      metadata: {
        value: deal.value ? Number(deal.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "",
        assignedTo: deal.assignedTo?.name ?? "",
        stage: deal.stage,
      },
    });
  }

  // 6. Proposals (valid until)
  const proposals = await prisma.proposal.findMany({
    where: {
      companyId,
      validUntil: { gte: startDate, lte: endDate },
    },
    include: {
      deal: { select: { title: true } },
    },
  });

  for (const prop of proposals) {
    if (!prop.validUntil) continue;
    events.push({
      id: prop.id,
      type: "proposal_valid_until",
      title: `Proposta #${prop.number} vence`,
      description: prop.deal.title,
      date: prop.validUntil.toISOString(),
      color: "bg-rose-500",
      href: `/crm/pipeline`,
      metadata: {
        value: Number(prop.totalValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
        status: prop.status,
      },
    });
  }

  // Sort all events by date
  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return events;
}
