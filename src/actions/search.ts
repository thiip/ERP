"use server";

import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";

export type SearchResultType =
  | "organization"
  | "contact"
  | "deal"
  | "product"
  | "invoice"
  | "production"
  | "expense"
  | "bankAccount"
  | "bankTransaction"
  | "materialRequisition"
  | "purchaseOrder"
  | "warehouseSector"
  | "financialCategory"
  | "costCenter"
  | "proposal"
  | "contract";

export type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  href: string;
};

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatBRL(value: unknown): string {
  if (value == null) return "";
  return brl.format(Number(value));
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];

  const companyId = await getActiveCompanyId();
  const q = query.trim();
  const insensitive = { contains: q, mode: "insensitive" as const };

  const [
    organizations,
    contacts,
    deals,
    products,
    invoices,
    productionOrders,
    expenses,
    bankAccounts,
    bankTransactions,
    materialRequisitions,
    purchaseOrders,
    warehouseSectors,
    financialCategories,
    costCenters,
    proposals,
    contracts,
  ] = await Promise.all([
    // 1. Organization
    prisma.organization.findMany({
      where: {
        companyId,
        OR: [
          { name: insensitive },
          { cnpj: { contains: q } },
          { city: insensitive },
          { state: insensitive },
          { email: insensitive },
          { phone: { contains: q } },
          { legalName: insensitive },
        ],
      },
      take: 5,
      orderBy: { name: "asc" },
    }),

    // 2. Contact
    prisma.contact.findMany({
      where: {
        companies: { some: { companyId } },
        OR: [
          { name: insensitive },
          { email: insensitive },
          { phone: { contains: q } },
          { position: insensitive },
        ],
      },
      include: { organization: { select: { name: true } } },
      take: 5,
      orderBy: { name: "asc" },
    }),

    // 3. Deal
    prisma.deal.findMany({
      where: {
        companyId,
        OR: [
          { title: insensitive },
          { organization: { name: insensitive } },
          { contact: { name: insensitive } },
        ],
      },
      include: {
        organization: { select: { name: true } },
        contact: { select: { name: true } },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),

    // 4. Product
    prisma.product.findMany({
      where: {
        companyId,
        isActive: true,
        OR: [
          { name: insensitive },
          { sku: insensitive },
          { code: insensitive },
          { description: insensitive },
          { barcode: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { name: "asc" },
    }),

    // 5. Invoice
    prisma.invoice.findMany({
      where: {
        companyId,
        OR: [
          { number: insensitive },
          { organization: { name: insensitive } },
        ],
      },
      include: {
        organization: { select: { name: true } },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),

    // 6. ProductionOrder (status is enum, can't use contains)
    prisma.productionOrder.findMany({
      where: {
        companyId,
        OR: [
          { title: insensitive },
          { orderNumber: insensitive },
          { notes: insensitive },
        ],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),

    // 7. Expense
    prisma.expense.findMany({
      where: {
        companyId,
        OR: [
          { description: insensitive },
          { category: insensitive },
          { bankAccount: { name: insensitive } },
        ],
      },
      include: {
        bankAccount: { select: { name: true } },
      },
      take: 5,
      orderBy: { date: "desc" },
    }),

    // 8. BankAccount
    prisma.bankAccount.findMany({
      where: {
        companyId,
        OR: [
          { name: insensitive },
          { bankName: insensitive },
          { accountNumber: { contains: q } },
          { agencyNumber: { contains: q } },
        ],
      },
      take: 5,
      orderBy: { name: "asc" },
    }),

    // 9. BankTransaction
    prisma.bankTransaction.findMany({
      where: {
        bankAccount: { companyId },
        OR: [
          { description: insensitive },
          { externalId: { contains: q } },
        ],
      },
      include: {
        bankAccount: { select: { name: true } },
      },
      take: 5,
      orderBy: { date: "desc" },
    }),

    // 10. MaterialRequisition
    prisma.materialRequisition.findMany({
      where: {
        companyId,
        OR: [
          { requisitionNumber: insensitive },
          { description: insensitive },
        ],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),

    // 11. PurchaseOrder
    prisma.purchaseOrder.findMany({
      where: {
        companyId,
        OR: [
          { supplierName: insensitive },
          { items: { some: { product: { name: insensitive } } } },
        ],
      },
      include: {
        items: {
          take: 1,
          include: { product: { select: { name: true } } },
        },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),

    // 12. WarehouseSector
    prisma.warehouseSector.findMany({
      where: {
        companyId,
        OR: [
          { name: insensitive },
          { code: insensitive },
        ],
      },
      take: 5,
      orderBy: { name: "asc" },
    }),

    // 13. FinancialCategory
    prisma.financialCategory.findMany({
      where: {
        companyId,
        OR: [
          { name: insensitive },
        ],
      },
      take: 5,
      orderBy: { name: "asc" },
    }),

    // 14. CostCenter
    prisma.costCenter.findMany({
      where: {
        companyId,
        OR: [
          { name: insensitive },
          { code: insensitive },
        ],
      },
      take: 5,
      orderBy: { name: "asc" },
    }),

    // 15. Proposal
    prisma.proposal.findMany({
      where: {
        companyId,
        OR: [
          { number: insensitive },
          { organization: { name: insensitive } },
        ],
      },
      include: {
        organization: { select: { name: true } },
        deal: { select: { title: true } },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),

    // 16. Contract (status is enum, can't use contains)
    prisma.contract.findMany({
      where: {
        companyId,
        OR: [
          { title: insensitive },
          { number: insensitive },
          { organization: { name: insensitive } },
        ],
      },
      include: {
        organization: { select: { name: true } },
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const results: SearchResult[] = [];

  // 1. Organizations
  for (const o of organizations) {
    results.push({
      id: o.id,
      type: "organization",
      title: o.name,
      subtitle: o.cnpj || o.city || "Empresa",
      href: `/crm/clients/organizations/${o.id}`,
    });
  }

  // 2. Contacts
  for (const c of contacts) {
    results.push({
      id: c.id,
      type: "contact",
      title: c.name,
      subtitle: c.organization?.name || c.email || c.position || "Contato",
      href: `/crm/clients/contacts/${c.id}`,
    });
  }

  // 3. Deals
  for (const d of deals) {
    const valuePart = d.value ? ` - ${formatBRL(d.value)}` : "";
    results.push({
      id: d.id,
      type: "deal",
      title: d.title,
      subtitle:
        (d.organization?.name || d.contact?.name || "Negocio") + valuePart,
      href: `/crm/deals/${d.id}`,
    });
  }

  // 4. Products
  for (const p of products) {
    results.push({
      id: p.id,
      type: "product",
      title: p.name,
      subtitle:
        [p.sku, p.code].filter(Boolean).join(" | ") ||
        (p.type === "RAW_MATERIAL" ? "Materia-prima" : "Produto"),
      href: `/inventory/products/${p.id}`,
    });
  }

  // 5. Invoices
  for (const inv of invoices) {
    const typeLabel = inv.type === "RECEIVABLE" ? "A receber" : "A pagar";
    results.push({
      id: inv.id,
      type: "invoice",
      title: `Fatura #${inv.number}`,
      subtitle: `${typeLabel} - ${formatBRL(inv.totalValue)}${inv.organization?.name ? ` - ${inv.organization.name}` : ""}`,
      href: `/erp/invoices`,
    });
  }

  // 6. Production Orders
  for (const po of productionOrders) {
    results.push({
      id: po.id,
      type: "production",
      title: po.title,
      subtitle: `#${po.orderNumber} - ${String(po.status)}`,
      href: `/production/orders/${po.id}`,
    });
  }

  // 7. Expenses
  for (const e of expenses) {
    results.push({
      id: e.id,
      type: "expense",
      title: e.description,
      subtitle: `${e.category}${e.bankAccount ? ` - ${e.bankAccount.name}` : ""} - ${formatBRL(e.value)}`,
      href: `/erp/expenses`,
    });
  }

  // 8. Bank Accounts
  for (const ba of bankAccounts) {
    results.push({
      id: ba.id,
      type: "bankAccount",
      title: ba.name,
      subtitle:
        [ba.bankName, ba.accountNumber ? `Conta ${ba.accountNumber}` : null, ba.agencyNumber ? `Ag ${ba.agencyNumber}` : null]
          .filter(Boolean)
          .join(" - "),
      href: `/erp/bank-accounts`,
    });
  }

  // 9. Bank Transactions
  for (const bt of bankTransactions) {
    results.push({
      id: bt.id,
      type: "bankTransaction",
      title: bt.description,
      subtitle: `${bt.bankAccount?.name || "Conta"} - ${formatBRL(bt.value)}`,
      href: `/erp/transactions`,
    });
  }

  // 10. Material Requisitions
  for (const mr of materialRequisitions) {
    results.push({
      id: mr.id,
      type: "materialRequisition",
      title: mr.description || `Requisicao #${mr.requisitionNumber}`,
      subtitle: `#${mr.requisitionNumber} - ${String(mr.status)}`,
      href: `/inventory/requisitions`,
    });
  }

  // 11. Purchase Orders
  for (const po of purchaseOrders) {
    const productName = po.items?.[0]?.product?.name;
    results.push({
      id: po.id,
      type: "purchaseOrder",
      title: `Pedido - ${po.supplierName}`,
      subtitle: `${formatBRL(po.totalValue)}${productName ? ` - ${productName}` : ""} - ${String(po.status)}`,
      href: `/inventory/purchase-orders`,
    });
  }

  // 12. Warehouse Sectors
  for (const ws of warehouseSectors) {
    results.push({
      id: ws.id,
      type: "warehouseSector",
      title: ws.name,
      subtitle: ws.code || "Setor",
      href: `/inventory/sectors`,
    });
  }

  // 13. Financial Categories
  for (const fc of financialCategories) {
    results.push({
      id: fc.id,
      type: "financialCategory",
      title: fc.name,
      subtitle: `Categoria - ${fc.type === "REVENUE" ? "Receita" : "Despesa"}`,
      href: `/erp/categories`,
    });
  }

  // 14. Cost Centers
  for (const cc of costCenters) {
    results.push({
      id: cc.id,
      type: "costCenter",
      title: cc.name,
      subtitle: cc.code || "Centro de custo",
      href: `/erp/cost-centers`,
    });
  }

  // 15. Proposals
  for (const p of proposals) {
    results.push({
      id: p.id,
      type: "proposal",
      title: `Proposta #${p.number}`,
      subtitle: `${p.organization?.name || p.deal?.title || "Proposta"} - ${formatBRL(p.totalValue)}`,
      href: `/erp/quotes`,
    });
  }

  // 16. Contracts
  for (const c of contracts) {
    results.push({
      id: c.id,
      type: "contract",
      title: c.title || `Contrato #${c.number}`,
      subtitle: `${c.organization?.name || ""} - ${formatBRL(c.totalValue)} - ${String(c.status)}`,
      href: `/erp/contracts`,
    });
  }

  return results;
}
