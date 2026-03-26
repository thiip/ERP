import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import ploomesData from "./ploomes-data.json" with { type: "json" };
import financialData2025 from "./financial-2025.json" with { type: "json" };

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean up existing data (order matters due to foreign keys)
  await prisma.customFieldValue.deleteMany();
  await prisma.customField.deleteMany();
  await prisma.formSection.deleteMany();
  await prisma.dealDocument.deleteMany();
  await prisma.proposalItem.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.pipeline.deleteMany();
  await prisma.contactCompany.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.productionOrderMaterial.deleteMany();
  await prisma.productionOrderItem.deleteMany();
  await prisma.productionOrder.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.materialAlert.deleteMany();
  await prisma.product.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.userCompanyAccess.deleteMany();
  // Clean admin/config tables that reference Company
  await prisma.systemModule.deleteMany();
  await prisma.preRegisteredOption.deleteMany();
  await prisma.companySetting.deleteMany();
  await prisma.userTeam.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.automation.deleteMany();
  await prisma.approvalFlow.deleteMany();
  await prisma.documentTemplate.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.webhook.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.processingQueue.deleteMany();
  await prisma.bankReconciliation.deleteMany();
  await prisma.financialTransfer.deleteMany();
  await prisma.dDABoleto.deleteMany();
  await prisma.financialHistory.deleteMany();
  await prisma.financialCategory.deleteMany();
  await prisma.costCenter.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.warehouseSector.deleteMany();
  await prisma.productLot.deleteMany();
  await prisma.billOfMaterial.deleteMany();
  await prisma.productionRouting.deleteMany();
  await prisma.inventoryCount.deleteMany();
  await prisma.materialRequisition.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.emailConfig.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  console.log("Dados anteriores limpos.");

  // Create companies
  const justSmile = await prisma.company.upsert({
    where: { cnpj: "00000000000100" },
    update: {},
    create: {
      name: "Just Smile",
      cnpj: "00000000000100",
      tradeName: "Just Smile Decoracoes",
      email: "contato@justsmile.com.br",
      phone: "(00) 0000-0000",
    },
  });

  const ltDecoracoes = await prisma.company.upsert({
    where: { cnpj: "00000000000200" },
    update: {},
    create: {
      name: "LT Decoracoes",
      cnpj: "00000000000200",
      tradeName: "LT Decoracoes de Natal",
      email: "contato@ltdecoracoes.com.br",
      phone: "(00) 0000-0000",
    },
  });

  // Create users
  const passwordHash = await bcrypt.hash("admin123", 10);

  const thiago = await prisma.user.upsert({
    where: { email: "thiago@projectum.com.br" },
    update: {},
    create: {
      name: "Thiago Furtado Padilha Madeira",
      email: "thiago@projectum.com.br",
      passwordHash,
      role: "ADMIN",
    },
  });

  const giselle = await prisma.user.upsert({
    where: { email: "giselle@projectum.com.br" },
    update: {},
    create: {
      name: "Giselle Castro",
      email: "giselle@projectum.com.br",
      passwordHash,
      role: "ADMIN",
    },
  });

  const lucas = await prisma.user.upsert({
    where: { email: "lucas@projectum.com.br" },
    update: {},
    create: {
      name: "Lucas Francischini",
      email: "lucas@projectum.com.br",
      passwordHash,
      role: "ADMIN",
    },
  });

  const dione = await prisma.user.upsert({
    where: { email: "dione@projectum.com.br" },
    update: {},
    create: {
      name: "Dione Furtado",
      email: "dione@projectum.com.br",
      passwordHash,
      role: "MANAGER",
    },
  });

  const flavia = await prisma.user.upsert({
    where: { email: "contato@projectum.com.br" },
    update: {},
    create: {
      name: "Flavia Moreira",
      email: "contato@projectum.com.br",
      passwordHash,
      role: "MANAGER",
    },
  });

  const andrew = await prisma.user.upsert({
    where: { email: "andrew@projectum.com.br" },
    update: {},
    create: {
      name: "Andrew",
      email: "andrew@projectum.com.br",
      passwordHash,
      role: "PRODUCTION",
    },
  });

  const newton = await prisma.user.upsert({
    where: { email: "newton@projectum.com.br" },
    update: {},
    create: {
      name: "Newton Alves",
      email: "newton@projectum.com.br",
      passwordHash,
      role: "SALES",
    },
  });

  // Grant access to both companies
  for (const user of [thiago, giselle, lucas, dione, flavia, andrew, newton]) {
    for (const company of [justSmile, ltDecoracoes]) {
      await prisma.userCompanyAccess.upsert({
        where: {
          userId_companyId: { userId: user.id, companyId: company.id },
        },
        update: {},
        create: { userId: user.id, companyId: company.id },
      });
    }
  }

  const companyId = justSmile.id;

  // ============================================================
  // Pipelines - Matching Ploomes funnels
  // ============================================================
  const justStageNames = [
    "Contato / Captação",
    "Briefing",
    "Projetos",
    "Apresentação",
    "Fechamento",
  ];

  const ltStageNames = [
    "Contato / Captação",
    "Briefing",
    "Projetos",
    "Apresentação/Orçamento",
    "Fechamento",
  ];

  const stageColors = [
    "border-t-blue-500",
    "border-t-yellow-500",
    "border-t-purple-500",
    "border-t-orange-500",
    "border-t-green-500",
  ];

  async function createPipeline(name: string, cId: string, stages: string[], order: number) {
    const pipeline = await prisma.pipeline.create({
      data: { name, companyId: cId, order },
    });
    const createdStages: Record<string, any> = {};
    for (let i = 0; i < stages.length; i++) {
      const stage = await prisma.pipelineStage.create({
        data: {
          pipelineId: pipeline.id,
          name: stages[i],
          order: i,
          color: stageColors[i] || null,
        },
      });
      createdStages[stages[i]] = stage;
    }
    return { pipeline, stages: createdStages };
  }

  const justPipeline = await createPipeline("Just", justSmile.id, justStageNames, 0);
  const ltPipeline = await createPipeline("LT", ltDecoracoes.id, ltStageNames, 0);
  const just2026Pipeline = await createPipeline("Just 2026", justSmile.id, justStageNames, 1);

  // ============================================================
  // Stage-specific CustomFields & FormSections
  // ============================================================
  type FieldDef = {
    name: string;
    label: string;
    fieldType: string;
    isRequired: boolean;
    options?: string;
    order: number;
  };

  const stageFieldDefs: Record<string, { sectionName: string; sectionLabel: string; fields: FieldDef[] }> = {
    "Contato / Captação": {
      sectionName: "captacao_info",
      sectionLabel: "Informações de Captação",
      fields: [
        { name: "lead_source", label: "Origem do Lead", fieldType: "SELECT", isRequired: false, options: JSON.stringify(["Indicação", "Site", "Redes Sociais", "Evento", "Outro"]), order: 0 },
        { name: "event_type", label: "Tipo de Evento/Projeto", fieldType: "SELECT", isRequired: false, options: JSON.stringify(["Natal", "Páscoa", "Carnaval", "Corporativo", "Outro"]), order: 1 },
        { name: "event_date", label: "Data Prevista do Evento", fieldType: "DATE", isRequired: false, order: 2 },
        { name: "event_location", label: "Local do Evento", fieldType: "TEXT", isRequired: false, order: 3 },
        { name: "initial_notes", label: "Observações Iniciais", fieldType: "TEXTAREA", isRequired: false, order: 4 },
      ],
    },
    "Briefing": {
      sectionName: "briefing_info",
      sectionLabel: "Informações do Briefing",
      fields: [
        { name: "project_description", label: "Descrição do Projeto", fieldType: "TEXTAREA", isRequired: false, order: 0 },
        { name: "decoration_points", label: "Qtd Pontos de Decoração", fieldType: "NUMBER", isRequired: false, order: 1 },
        { name: "client_budget", label: "Orçamento Estimado do Cliente", fieldType: "CURRENCY", isRequired: false, order: 2 },
        { name: "visual_references", label: "Referências Visuais", fieldType: "TEXTAREA", isRequired: false, order: 3 },
        { name: "special_requirements", label: "Requisitos Especiais", fieldType: "TEXTAREA", isRequired: false, order: 4 },
        { name: "assembly_deadline", label: "Prazo de Montagem", fieldType: "DATE", isRequired: false, order: 5 },
        { name: "disassembly_deadline", label: "Prazo de Desmontagem", fieldType: "DATE", isRequired: false, order: 6 },
        { name: "project_responsible", label: "Responsável pelo Projeto", fieldType: "SELECT", isRequired: false, options: JSON.stringify(["Thiago Furtado Padilha Madeira", "Giselle Castro", "Lucas Francischini", "Dione Furtado", "Flavia Moreira", "Andrew", "Newton Alves"]), order: 7 },
      ],
    },
    "Projetos": {
      sectionName: "projetos_info",
      sectionLabel: "Informações do Projeto",
      fields: [
        { name: "proposal_value", label: "Valor da Proposta", fieldType: "CURRENCY", isRequired: false, order: 0 },
        { name: "project_items", label: "Itens do Projeto", fieldType: "TEXTAREA", isRequired: false, order: 1 },
        { name: "proposal_sent_date", label: "Data de Envio da Proposta", fieldType: "DATE", isRequired: false, order: 2 },
        { name: "proposal_file_link", label: "Link da Proposta", fieldType: "URL", isRequired: false, order: 3 },
        { name: "approval_status", label: "Status da Aprovação", fieldType: "SELECT", isRequired: false, options: JSON.stringify(["Aguardando", "Revisão Solicitada", "Aprovado"]), order: 4 },
        { name: "project_notes", label: "Observações do Projeto", fieldType: "TEXTAREA", isRequired: false, order: 5 },
      ],
    },
    "Apresentação": {
      sectionName: "apresentacao_info",
      sectionLabel: "Informações da Apresentação",
      fields: [
        { name: "presentation_date", label: "Data da Apresentação", fieldType: "DATE", isRequired: false, order: 0 },
        { name: "client_feedback", label: "Feedback do Cliente", fieldType: "TEXTAREA", isRequired: false, order: 1 },
        { name: "requested_adjustments", label: "Ajustes Solicitados", fieldType: "TEXTAREA", isRequired: false, order: 2 },
        { name: "final_negotiated_value", label: "Valor Final Negociado", fieldType: "CURRENCY", isRequired: false, order: 3 },
        { name: "payment_conditions", label: "Condições de Pagamento", fieldType: "TEXT", isRequired: false, order: 4 },
        { name: "closing_forecast", label: "Previsão de Fechamento", fieldType: "DATE", isRequired: false, order: 5 },
      ],
    },
    // LT variant
    "Apresentação/Orçamento": {
      sectionName: "apresentacao_info",
      sectionLabel: "Informações da Apresentação/Orçamento",
      fields: [
        { name: "presentation_date", label: "Data da Apresentação", fieldType: "DATE", isRequired: false, order: 0 },
        { name: "client_feedback", label: "Feedback do Cliente", fieldType: "TEXTAREA", isRequired: false, order: 1 },
        { name: "requested_adjustments", label: "Ajustes Solicitados", fieldType: "TEXTAREA", isRequired: false, order: 2 },
        { name: "final_negotiated_value", label: "Valor Final Negociado", fieldType: "CURRENCY", isRequired: false, order: 3 },
        { name: "payment_conditions", label: "Condições de Pagamento", fieldType: "TEXT", isRequired: false, order: 4 },
        { name: "closing_forecast", label: "Previsão de Fechamento", fieldType: "DATE", isRequired: false, order: 5 },
      ],
    },
  };

  // Seed fields for all pipelines
  async function seedStageFields(pipelineData: { pipeline: any; stages: Record<string, any> }, cId: string) {
    for (const [stageName, stageRecord] of Object.entries(pipelineData.stages)) {
      const def = stageFieldDefs[stageName];
      if (!def) continue; // skip "Fechamento" etc.

      // Create FormSection
      await prisma.formSection.create({
        data: {
          companyId: cId,
          entity: "deal",
          pipelineStageId: stageRecord.id,
          name: def.sectionName,
          label: def.sectionLabel,
          order: 0,
          isCollapsible: true,
          isDefault: true,
        },
      });

      // Create CustomFields
      for (const field of def.fields) {
        await prisma.customField.create({
          data: {
            companyId: cId,
            entity: "deal",
            pipelineStageId: stageRecord.id,
            section: def.sectionName,
            name: field.name,
            label: field.label,
            fieldType: field.fieldType as any,
            isRequired: field.isRequired,
            options: field.options || null,
            order: field.order,
          },
        });
      }
    }
  }

  await seedStageFields(justPipeline, justSmile.id);
  await seedStageFields(ltPipeline, ltDecoracoes.id);
  await seedStageFields(just2026Pipeline, justSmile.id);

  console.log("  - Campos por etapa do pipeline criados");

  // Map responsible names to user IDs
  const responsibleMap: Record<string, string> = {
    "Thiago Furtado Padilha Madeira": thiago.id,
    "Giselle Castro": giselle.id,
    "Lucas Francischini": lucas.id,
    "Dione Furtado": dione.id,
    "Flavia Moreira": flavia.id,
    "Andrew": andrew.id,
    "Newton Alves": newton.id,
  };

  // Guess segment from name
  function guessSegment(name: string): "SHOPPING" | "PREFEITURA" | "CONDOMINIO" | "EMPRESA" | "OUTRO" {
    const lower = name.toLowerCase();
    if (lower.includes("shopping") || lower.includes("plaza") || lower.includes("patio") || lower.includes("iguatemi") || lower.includes("partage") || lower.includes("diamondmall") || lower.includes("miramar")) return "SHOPPING";
    if (lower.includes("prefeitura")) return "PREFEITURA";
    if (lower.includes("condominio")) return "CONDOMINIO";
    if (lower.includes("rede ancar") || lower.includes("north shopping")) return "SHOPPING";
    return "EMPRESA";
  }

  // ============================================================
  // Organizations (Empresas) - All from Ploomes
  // ============================================================
  const orgs: Record<string, any> = {};

  for (const emp of ploomesData.empresas) {
    const responsible = responsibleMap[emp.responsavel] || null;
    const org = await prisma.organization.create({
      data: {
        companyId,
        name: emp.nome,
        cnpj: emp.cnpj || null,
        city: emp.cidade || null,
        segment: guessSegment(emp.nome),
        origin: "INDICACAO",
        status: "ACTIVE",
        responsibleUserId: responsible,
      },
    });
    orgs[emp.nome] = org;
  }

  // ============================================================
  // Contacts (Contatos) - All from Ploomes
  // ============================================================
  const contacts: Record<string, any> = {};

  for (const ct of ploomesData.contatos) {
    const org = ct.empresa ? orgs[ct.empresa] : null;
    const isPF = !ct.empresa && ct.nome === "Paula";
    const contact = await prisma.contact.create({
      data: {
        name: ct.nome,
        email: ct.email || null,
        phone: ct.telefone || null,
        position: ct.cargo || null,
        organizationId: org?.id || null,
        isPF,
        companies: { create: { companyId } },
      },
    });
    contacts[ct.nome] = contact;
  }

  // ============================================================
  // Products (Produtos) - All from Ploomes
  // ============================================================
  let itemCounter = 1;
  for (const pd of ploomesData.produtos) {
    await prisma.product.create({
      data: {
        companyId,
        name: pd.nome,
        code: pd.codigo || null,
        group: pd.grupo || "A",
        itemNumber: itemCounter++,
        description: pd.descricao || null,
        type: "FINISHED_PRODUCT",
        unit: "unidade",
        currentStock: 1,
        minimumStock: 0,
        salePrice: pd.valorTotal ?? undefined,
        costPrice: pd.valorLocacao ?? undefined,
      },
    });
  }

  // ============================================================
  // Deals (Negócios / Projetos) - All from Ploomes
  // ============================================================
  for (const pj of ploomesData.projetos) {
    const org = orgs[pj.cliente];
    // Find the contact by name from the deal data, fallback to org contact
    const dealContact = (pj as any).contato
      ? ploomesData.contatos.find((c) => c.nome.startsWith((pj as any).contato))
      : null;
    const orgContact = ploomesData.contatos.find(
      (c) => c.empresa === pj.cliente
    );
    const contact = dealContact
      ? contacts[dealContact.nome]
      : orgContact
        ? contacts[orgContact.nome]
        : null;

    const presentationStage = just2026Pipeline.stages["Apresentação"];
    await prisma.deal.create({
      data: {
        companyId,
        title: pj.nome,
        organizationId: org?.id || null,
        contactId: contact?.id || null,
        value: pj.valor,
        stage: "PRESENTATION",
        pipelineId: just2026Pipeline.pipeline.id,
        pipelineStageId: presentationStage?.id || null,
        budget: (pj as any).verba || pj.valor,
        decorationTheme: (pj as any).tema || pj.nome,
        considerations: (pj as any).consideracoes || null,
        assignedToId: giselle.id,
      },
    });
  }

  console.log("Seed concluído com dados completos do Ploomes:");
  console.log(`  - Just Smile: ${justSmile.id}`);
  console.log(`  - LT Decorações: ${ltDecoracoes.id}`);
  console.log(`  - Pipelines: Just, LT, Just 2026`);
  console.log(`  - ${ploomesData.empresas.length} empresas criadas`);
  console.log(`  - ${ploomesData.contatos.length} contatos criados`);
  // ===== FINANCIAL SEED DATA (2025 - Just Smile) =====
  // Data from "Despesas Mensais 2025.xlsx" spreadsheet
  const finData = financialData2025 as { d: string; n: string; v: number; c: string; s: string }[];

  let invoiceCounter = 1;
  for (const item of finData) {
    await prisma.invoice.create({
      data: {
        companyId: justSmile.id,
        number: `FIN-2025-${String(invoiceCounter++).padStart(4, "0")}`,
        type: "PAYABLE",
        totalValue: item.v,
        status: item.s as "PAID" | "ISSUED",
        dueDate: new Date(item.d),
        issuedAt: new Date(item.d),
        paidAt: item.s === "PAID" ? new Date(item.d) : null,
        notes: item.n,
        category: item.c,
      },
    });
  }

  console.log(`  - ${finData.length} faturas financeiras 2025 criadas (Just Smile)`);
  console.log(`  - ${ploomesData.produtos.length} produtos criados`);
  console.log(`  - ${ploomesData.projetos.length} negócios criados (Just 2026 pipeline)`);
  console.log(`  - Thiago: thiago@projectum.com.br / admin123`);
  console.log(`  - Giselle: giselle@projectum.com.br / admin123`);
  console.log(`  - Lucas: lucas@projectum.com.br / admin123`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
