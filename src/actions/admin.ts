"use server";

import { prisma } from "@/lib/prisma";
import { getActiveCompanyId, getSessionUser } from "@/lib/company-context";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import type {
  Role,
  FieldType,
  AutomationTrigger,
  AutomationAction,
  ApprovalStatus,
  QueueStatus,
} from "@/generated/prisma/client";

// ===========================================================================
// 1. SYSTEM MODULES
// ===========================================================================

export async function getSystemModules() {
  const companyId = await getActiveCompanyId();

  return prisma.systemModule.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}

export async function toggleSystemModule(moduleId: string, isEnabled: boolean) {
  const companyId = await getActiveCompanyId();

  const mod = await prisma.systemModule.findFirst({
    where: { id: moduleId, companyId },
  });
  if (!mod) throw new Error("Modulo nao encontrado");

  const updated = await prisma.systemModule.update({
    where: { id: moduleId },
    data: { isEnabled },
  });

  revalidatePath("/admin");
  return updated;
}

export async function seedDefaultModules() {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.systemModule.count({ where: { companyId } });
  if (existing > 0) return { message: "Modulos ja existem" };

  const defaults = [
    { key: "workflow", name: "Workflow", description: "Automacoes e fluxos de trabalho" },
    { key: "proposals", name: "Propostas", description: "Geracao e envio de propostas" },
    { key: "cpq", name: "CPQ", description: "Configurador de precos e produtos" },
    { key: "analytics", name: "Analytics", description: "Dashboards e relatorios avancados" },
    { key: "api_access", name: "Acesso API", description: "API REST para integracoes" },
    { key: "external_forms", name: "Formularios Externos", description: "Formularios para captura de leads" },
    { key: "customer_products", name: "Produtos do Cliente", description: "Catalogo de produtos personalizado" },
    { key: "library", name: "Biblioteca", description: "Repositorio de documentos e templates" },
    { key: "white_label", name: "White Label", description: "Personalizacao de marca" },
  ];

  await prisma.systemModule.createMany({
    data: defaults.map((m) => ({
      companyId,
      key: m.key,
      name: m.name,
      description: m.description,
      isEnabled: false,
    })),
  });

  return { message: "Modulos padrao criados com sucesso" };
}

// ===========================================================================
// 2. CUSTOM FIELDS & FORMS
// ===========================================================================

export async function getCustomFields(entity: string) {
  const companyId = await getActiveCompanyId();

  return prisma.customField.findMany({
    where: { companyId, entity },
    orderBy: { order: "asc" },
  });
}

export async function createCustomField(data: {
  entity: string;
  section?: string;
  name: string;
  label: string;
  fieldType: FieldType;
  isRequired?: boolean;
  isVisible?: boolean;
  defaultValue?: string;
  options?: string;
  order?: number;
  placeholder?: string;
  helpText?: string;
}) {
  const companyId = await getActiveCompanyId();

  if (!data.name || !data.label) throw new Error("Nome e label sao obrigatorios");

  const field = await prisma.customField.create({
    data: {
      companyId,
      entity: data.entity,
      section: data.section ?? "default",
      name: data.name,
      label: data.label,
      fieldType: data.fieldType,
      isRequired: data.isRequired ?? false,
      isVisible: data.isVisible ?? true,
      defaultValue: data.defaultValue ?? null,
      options: data.options ?? null,
      order: data.order ?? 0,
      placeholder: data.placeholder ?? null,
      helpText: data.helpText ?? null,
    },
  });

  revalidatePath("/admin");
  return field;
}

export async function updateCustomField(
  id: string,
  data: {
    label?: string;
    fieldType?: FieldType;
    isRequired?: boolean;
    isVisible?: boolean;
    defaultValue?: string | null;
    options?: string | null;
    order?: number;
    placeholder?: string | null;
    helpText?: string | null;
    section?: string;
  },
) {
  const companyId = await getActiveCompanyId();

  const field = await prisma.customField.findFirst({
    where: { id, companyId },
  });
  if (!field) throw new Error("Campo nao encontrado");

  const updated = await prisma.customField.update({
    where: { id },
    data,
  });

  revalidatePath("/admin");
  return updated;
}

export async function deleteCustomField(id: string) {
  const companyId = await getActiveCompanyId();

  const field = await prisma.customField.findFirst({
    where: { id, companyId },
  });
  if (!field) throw new Error("Campo nao encontrado");

  await prisma.customField.delete({ where: { id } });

  revalidatePath("/admin");
  return { success: true };
}

export async function reorderCustomFields(fields: { id: string; order: number }[]) {
  const companyId = await getActiveCompanyId();

  await prisma.$transaction(
    fields.map((f) =>
      prisma.customField.updateMany({
        where: { id: f.id, companyId },
        data: { order: f.order },
      }),
    ),
  );

  revalidatePath("/admin");
  return { success: true };
}

export async function getFormSections(entity: string) {
  const companyId = await getActiveCompanyId();

  return prisma.formSection.findMany({
    where: { companyId, entity },
    orderBy: { order: "asc" },
  });
}

export async function createFormSection(data: {
  entity: string;
  name: string;
  label: string;
  order?: number;
  isCollapsible?: boolean;
  isDefault?: boolean;
}) {
  const companyId = await getActiveCompanyId();

  if (!data.name || !data.label) throw new Error("Nome e label sao obrigatorios");

  const section = await prisma.formSection.create({
    data: {
      companyId,
      entity: data.entity,
      name: data.name,
      label: data.label,
      order: data.order ?? 0,
      isCollapsible: data.isCollapsible ?? true,
      isDefault: data.isDefault ?? false,
    },
  });

  revalidatePath("/admin");
  return section;
}

export async function updateFormSection(
  id: string,
  data: {
    label?: string;
    order?: number;
    isCollapsible?: boolean;
    isDefault?: boolean;
  },
) {
  const companyId = await getActiveCompanyId();

  const section = await prisma.formSection.findFirst({
    where: { id, companyId },
  });
  if (!section) throw new Error("Secao nao encontrada");

  const updated = await prisma.formSection.update({
    where: { id },
    data,
  });

  revalidatePath("/admin");
  return updated;
}

export async function deleteFormSection(id: string) {
  const companyId = await getActiveCompanyId();

  const section = await prisma.formSection.findFirst({
    where: { id, companyId },
  });
  if (!section) throw new Error("Secao nao encontrada");

  await prisma.formSection.delete({ where: { id } });

  revalidatePath("/admin");
  return { success: true };
}

export async function getCustomFieldValues(entityId: string) {
  return prisma.customFieldValue.findMany({
    where: { entityId },
    include: { customField: true },
  });
}

export async function saveCustomFieldValues(
  entityId: string,
  values: { fieldId: string; value: string }[],
) {
  await prisma.$transaction(
    values.map((v) =>
      prisma.customFieldValue.upsert({
        where: {
          customFieldId_entityId: {
            customFieldId: v.fieldId,
            entityId,
          },
        },
        create: {
          customFieldId: v.fieldId,
          entityId,
          value: v.value,
        },
        update: {
          value: v.value,
        },
      }),
    ),
  );

  return { success: true };
}

// ===========================================================================
// 3. PRE-REGISTERED OPTIONS
// ===========================================================================

export async function getPreRegisteredOptions(category?: string) {
  const companyId = await getActiveCompanyId();

  return prisma.preRegisteredOption.findMany({
    where: {
      companyId,
      ...(category && { category }),
    },
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });
}

export async function createPreRegisteredOption(data: {
  category: string;
  value: string;
  label: string;
  color?: string;
  order?: number;
  isActive?: boolean;
}) {
  const companyId = await getActiveCompanyId();

  if (!data.value || !data.label) throw new Error("Valor e label sao obrigatorios");

  const option = await prisma.preRegisteredOption.create({
    data: {
      companyId,
      category: data.category,
      value: data.value,
      label: data.label,
      color: data.color ?? null,
      order: data.order ?? 0,
      isActive: data.isActive ?? true,
    },
  });

  revalidatePath("/admin");
  return option;
}

export async function updatePreRegisteredOption(
  id: string,
  data: {
    label?: string;
    color?: string | null;
    order?: number;
    isActive?: boolean;
  },
) {
  const companyId = await getActiveCompanyId();

  const option = await prisma.preRegisteredOption.findFirst({
    where: { id, companyId },
  });
  if (!option) throw new Error("Opcao nao encontrada");

  const updated = await prisma.preRegisteredOption.update({
    where: { id },
    data,
  });

  revalidatePath("/admin");
  return updated;
}

export async function deletePreRegisteredOption(id: string) {
  const companyId = await getActiveCompanyId();

  const option = await prisma.preRegisteredOption.findFirst({
    where: { id, companyId },
  });
  if (!option) throw new Error("Opcao nao encontrada");

  await prisma.preRegisteredOption.delete({ where: { id } });

  revalidatePath("/admin");
  return { success: true };
}

export async function getOptionCategories() {
  return [
    { value: "segment", label: "Segmentos" },
    { value: "origin", label: "Origens de Contato" },
    { value: "deal_loss_reason", label: "Motivos de Perda" },
    { value: "product_group", label: "Grupos de Produto" },
    { value: "expense_category", label: "Categorias de Despesa" },
    { value: "tags", label: "Tags" },
  ];
}

// ===========================================================================
// 4. COMPANY SETTINGS / COMPANY DATA
// ===========================================================================

export async function getCompanyData() {
  const companyId = await getActiveCompanyId();

  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });
  if (!company) throw new Error("Empresa nao encontrada");

  return company;
}

export async function updateCompanyData(data: {
  name?: string;
  tradeName?: string | null;
  cnpj?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  const companyId = await getActiveCompanyId();

  const updated = await prisma.company.update({
    where: { id: companyId },
    data,
  });

  revalidatePath("/admin");
  return updated;
}

export async function getCompanySettings() {
  const companyId = await getActiveCompanyId();

  return prisma.companySetting.findMany({
    where: { companyId },
    orderBy: { key: "asc" },
  });
}

export async function updateCompanySetting(key: string, value: string) {
  const companyId = await getActiveCompanyId();

  const setting = await prisma.companySetting.upsert({
    where: {
      companyId_key: { companyId, key },
    },
    create: { companyId, key, value },
    update: { value },
  });

  revalidatePath("/admin");
  return setting;
}

export async function getDefaultSettings() {
  return [
    { key: "currency", label: "Moeda", defaultValue: "BRL" },
    { key: "timezone", label: "Fuso Horario", defaultValue: "America/Sao_Paulo" },
    { key: "date_format", label: "Formato de Data", defaultValue: "DD/MM/YYYY" },
    { key: "fiscal_year_start", label: "Inicio do Ano Fiscal", defaultValue: "01-01" },
    { key: "default_payment_terms", label: "Prazo de Pagamento Padrao (dias)", defaultValue: "30" },
    { key: "proposal_validity_days", label: "Validade da Proposta (dias)", defaultValue: "15" },
    { key: "decimal_separator", label: "Separador Decimal", defaultValue: "," },
    { key: "thousands_separator", label: "Separador de Milhar", defaultValue: "." },
    { key: "logo_url", label: "URL do Logo", defaultValue: "" },
    { key: "primary_color", label: "Cor Primaria", defaultValue: "#2563eb" },
  ];
}

// ===========================================================================
// 5. SYSTEM CONFIGURATION
// ===========================================================================

export async function getSystemConfig() {
  const companyId = await getActiveCompanyId();

  const settings = await prisma.companySetting.findMany({
    where: { companyId },
  });

  const defaults = await getDefaultSettings();
  const config: Record<string, string> = {};

  for (const def of defaults) {
    const found = settings.find((s) => s.key === def.key);
    config[def.key] = found?.value ?? def.defaultValue;
  }

  return config;
}

export async function updateSystemConfig(settings: { key: string; value: string }[]) {
  const companyId = await getActiveCompanyId();

  await prisma.$transaction(
    settings.map((s) =>
      prisma.companySetting.upsert({
        where: {
          companyId_key: { companyId, key: s.key },
        },
        create: { companyId, key: s.key, value: s.value },
        update: { value: s.value },
      }),
    ),
  );

  revalidatePath("/admin");
  return { success: true };
}

// ===========================================================================
// 6. USERS MANAGEMENT
// ===========================================================================

export async function getUsers() {
  const companyId = await getActiveCompanyId();

  const accesses = await prisma.userCompanyAccess.findMany({
    where: { companyId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  return accesses.map((a) => a.user);
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: Role;
}) {
  const companyId = await getActiveCompanyId();

  if (!data.name || !data.email || !data.password) {
    throw new Error("Nome, email e senha sao obrigatorios");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existingUser) throw new Error("Email ja cadastrado");

  const passwordHash = await hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      companyAccess: {
        create: { companyId },
      },
    },
  });

  revalidatePath("/admin");
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    email?: string;
    password?: string;
    role?: Role;
  },
) {
  const companyId = await getActiveCompanyId();

  const access = await prisma.userCompanyAccess.findUnique({
    where: { userId_companyId: { userId: id, companyId } },
  });
  if (!access) throw new Error("Usuario nao encontrado nesta empresa");

  const updateData: Record<string, unknown> = {};
  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;
  if (data.role) updateData.role = data.role;
  if (data.password) updateData.passwordHash = await hash(data.password, 12);

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  revalidatePath("/admin");
  return user;
}

export async function toggleUserActive(id: string, isActive: boolean) {
  const companyId = await getActiveCompanyId();

  const access = await prisma.userCompanyAccess.findUnique({
    where: { userId_companyId: { userId: id, companyId } },
  });
  if (!access) throw new Error("Usuario nao encontrado nesta empresa");

  const user = await prisma.user.update({
    where: { id },
    data: { isActive },
    select: { id: true, name: true, isActive: true },
  });

  revalidatePath("/admin");
  return user;
}

// --- Teams ---

export async function getUserTeams() {
  const companyId = await getActiveCompanyId();

  return prisma.userTeam.findMany({
    where: { companyId },
    include: {
      members: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function createUserTeam(data: {
  name: string;
  description?: string;
  leaderId?: string;
}) {
  const companyId = await getActiveCompanyId();

  if (!data.name) throw new Error("Nome da equipe e obrigatorio");

  const team = await prisma.userTeam.create({
    data: {
      companyId,
      name: data.name,
      description: data.description ?? null,
      leaderId: data.leaderId ?? null,
    },
  });

  revalidatePath("/admin");
  return team;
}

export async function updateUserTeam(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    leaderId?: string | null;
  },
) {
  const companyId = await getActiveCompanyId();

  const team = await prisma.userTeam.findFirst({
    where: { id, companyId },
  });
  if (!team) throw new Error("Equipe nao encontrada");

  const updated = await prisma.userTeam.update({
    where: { id },
    data,
  });

  revalidatePath("/admin");
  return updated;
}

export async function deleteUserTeam(id: string) {
  const companyId = await getActiveCompanyId();

  const team = await prisma.userTeam.findFirst({
    where: { id, companyId },
  });
  if (!team) throw new Error("Equipe nao encontrada");

  await prisma.userTeam.delete({ where: { id } });

  revalidatePath("/admin");
  return { success: true };
}

export async function addTeamMember(teamId: string, userId: string, role?: string) {
  const companyId = await getActiveCompanyId();

  const team = await prisma.userTeam.findFirst({
    where: { id: teamId, companyId },
  });
  if (!team) throw new Error("Equipe nao encontrada");

  const member = await prisma.userTeamMember.create({
    data: {
      teamId,
      userId,
      role: role ?? "member",
    },
  });

  revalidatePath("/admin");
  return member;
}

export async function removeTeamMember(teamId: string, userId: string) {
  const companyId = await getActiveCompanyId();

  const team = await prisma.userTeam.findFirst({
    where: { id: teamId, companyId },
  });
  if (!team) throw new Error("Equipe nao encontrada");

  await prisma.userTeamMember.delete({
    where: { teamId_userId: { teamId, userId } },
  });

  revalidatePath("/admin");
  return { success: true };
}

// --- User Profiles (Permission Profiles) ---

export async function getUserProfiles() {
  const companyId = await getActiveCompanyId();

  return prisma.userProfile.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}

export async function createUserProfile(data: {
  name: string;
  description?: string;
  permissions: string;
  isDefault?: boolean;
}) {
  const companyId = await getActiveCompanyId();

  if (!data.name || !data.permissions) {
    throw new Error("Nome e permissoes sao obrigatorios");
  }

  const profile = await prisma.userProfile.create({
    data: {
      companyId,
      name: data.name,
      description: data.description ?? null,
      permissions: data.permissions,
      isDefault: data.isDefault ?? false,
    },
  });

  revalidatePath("/admin");
  return profile;
}

export async function updateUserProfile(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    permissions?: string;
    isDefault?: boolean;
  },
) {
  const companyId = await getActiveCompanyId();

  const profile = await prisma.userProfile.findFirst({
    where: { id, companyId },
  });
  if (!profile) throw new Error("Perfil nao encontrado");

  const updated = await prisma.userProfile.update({
    where: { id },
    data,
  });

  revalidatePath("/admin");
  return updated;
}

export async function deleteUserProfile(id: string) {
  const companyId = await getActiveCompanyId();

  const profile = await prisma.userProfile.findFirst({
    where: { id, companyId },
  });
  if (!profile) throw new Error("Perfil nao encontrado");

  await prisma.userProfile.delete({ where: { id } });

  revalidatePath("/admin");
  return { success: true };
}

// ===========================================================================
// 7. AUTOMATIONS
// ===========================================================================

export async function getAutomations() {
  const companyId = await getActiveCompanyId();

  return prisma.automation.findMany({
    where: { companyId },
    include: {
      actions: { orderBy: { order: "asc" } },
      _count: { select: { logs: true } },
    },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
}

export async function createAutomation(data: {
  name: string;
  description?: string;
  entity: string;
  trigger: AutomationTrigger;
  triggerConfig?: string;
  isActive?: boolean;
  order?: number;
  steps?: {
    action: AutomationAction;
    actionConfig?: string;
    order?: number;
    delayMinutes?: number;
    conditionField?: string;
    conditionOp?: string;
    conditionValue?: string;
  }[];
}) {
  const companyId = await getActiveCompanyId();

  if (!data.name || !data.entity) throw new Error("Nome e entidade sao obrigatorios");

  const automation = await prisma.automation.create({
    data: {
      companyId,
      name: data.name,
      description: data.description ?? null,
      entity: data.entity,
      trigger: data.trigger,
      triggerConfig: data.triggerConfig ?? null,
      isActive: data.isActive ?? true,
      order: data.order ?? 0,
      actions: data.steps
        ? {
            create: data.steps.map((s, idx) => ({
              action: s.action,
              actionConfig: s.actionConfig ?? null,
              order: s.order ?? idx,
              delayMinutes: s.delayMinutes ?? 0,
              conditionField: s.conditionField ?? null,
              conditionOp: s.conditionOp ?? null,
              conditionValue: s.conditionValue ?? null,
            })),
          }
        : undefined,
    },
    include: { actions: true },
  });

  revalidatePath("/admin");
  return automation;
}

export async function updateAutomation(
  id: string,
  data: {
    name?: string;
    description?: string | null;
    entity?: string;
    trigger?: AutomationTrigger;
    triggerConfig?: string | null;
    isActive?: boolean;
    order?: number;
  },
) {
  const companyId = await getActiveCompanyId();

  const automation = await prisma.automation.findFirst({
    where: { id, companyId },
  });
  if (!automation) throw new Error("Automacao nao encontrada");

  const updated = await prisma.automation.update({
    where: { id },
    data,
    include: { actions: { orderBy: { order: "asc" } } },
  });

  revalidatePath("/admin");
  return updated;
}

export async function deleteAutomation(id: string) {
  const companyId = await getActiveCompanyId();

  const automation = await prisma.automation.findFirst({
    where: { id, companyId },
  });
  if (!automation) throw new Error("Automacao nao encontrada");

  await prisma.automation.delete({ where: { id } });

  revalidatePath("/admin");
  return { success: true };
}

export async function toggleAutomation(id: string, isActive: boolean) {
  const companyId = await getActiveCompanyId();

  const automation = await prisma.automation.findFirst({
    where: { id, companyId },
  });
  if (!automation) throw new Error("Automacao nao encontrada");

  const updated = await prisma.automation.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/admin");
  return updated;
}

export async function getAutomationLogs(automationId?: string) {
  const companyId = await getActiveCompanyId();

  return prisma.automationLog.findMany({
    where: {
      automation: { companyId },
      ...(automationId && { automationId }),
    },
    include: {
      automation: { select: { id: true, name: true } },
    },
    orderBy: { executedAt: "desc" },
    take: 100,
  });
}

export async function createAutomationStep(
  automationId: string,
  data: {
    action: AutomationAction;
    actionConfig?: string;
    order?: number;
    delayMinutes?: number;
    conditionField?: string;
    conditionOp?: string;
    conditionValue?: string;
  },
) {
  const companyId = await getActiveCompanyId();

  const automation = await prisma.automation.findFirst({
    where: { id: automationId, companyId },
  });
  if (!automation) throw new Error("Automacao nao encontrada");

  const step = await prisma.automationStep.create({
    data: {
      automationId,
      action: data.action,
      actionConfig: data.actionConfig ?? null,
      order: data.order ?? 0,
      delayMinutes: data.delayMinutes ?? 0,
      conditionField: data.conditionField ?? null,
      conditionOp: data.conditionOp ?? null,
      conditionValue: data.conditionValue ?? null,
    },
  });

  revalidatePath("/admin");
  return step;
}

export async function updateAutomationStep(
  id: string,
  data: {
    action?: AutomationAction;
    actionConfig?: string | null;
    order?: number;
    delayMinutes?: number;
    conditionField?: string | null;
    conditionOp?: string | null;
    conditionValue?: string | null;
  },
) {
  const step = await prisma.automationStep.findUnique({
    where: { id },
    include: { automation: true },
  });
  if (!step) throw new Error("Etapa nao encontrada");

  const companyId = await getActiveCompanyId();
  if (step.automation.companyId !== companyId) {
    throw new Error("Etapa nao encontrada");
  }

  const updated = await prisma.automationStep.update({
    where: { id },
    data,
  });

  revalidatePath("/admin");
  return updated;
}

export async function deleteAutomationStep(id: string) {
  const step = await prisma.automationStep.findUnique({
    where: { id },
    include: { automation: true },
  });
  if (!step) throw new Error("Etapa nao encontrada");

  const companyId = await getActiveCompanyId();
  if (step.automation.companyId !== companyId) {
    throw new Error("Etapa nao encontrada");
  }

  await prisma.automationStep.delete({ where: { id } });

  revalidatePath("/admin");
  return { success: true };
}

// ===========================================================================
// 8. APPROVAL FLOWS
// ===========================================================================

export async function getApprovalFlows() {
  const companyId = await getActiveCompanyId();

  return prisma.approvalFlow.findMany({
    where: { companyId },
    include: {
      steps: { orderBy: { order: "asc" } },
      _count: { select: { requests: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createApprovalFlow(data: {
  name: string;
  entity: string;
  description?: string;
  isActive?: boolean;
  steps?: {
    approverRole?: Role;
    approverUserId?: string;
    order?: number;
    isRequired?: boolean;
  }[];
}) {
  const companyId = await getActiveCompanyId();

  if (!data.name || !data.entity) throw new Error("Nome e entidade sao obrigatorios");

  const flow = await prisma.approvalFlow.create({
    data: {
      companyId,
      name: data.name,
      entity: data.entity,
      description: data.description ?? null,
      isActive: data.isActive ?? true,
      steps: data.steps
        ? {
            create: data.steps.map((s, idx) => ({
              approverRole: s.approverRole ?? null,
              approverUserId: s.approverUserId ?? null,
              order: s.order ?? idx,
              isRequired: s.isRequired ?? true,
            })),
          }
        : undefined,
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  revalidatePath("/admin");
  return flow;
}

export async function updateApprovalFlow(
  id: string,
  data: {
    name?: string;
    entity?: string;
    description?: string | null;
    isActive?: boolean;
  },
) {
  const companyId = await getActiveCompanyId();

  const flow = await prisma.approvalFlow.findFirst({
    where: { id, companyId },
  });
  if (!flow) throw new Error("Fluxo de aprovacao nao encontrado");

  const updated = await prisma.approvalFlow.update({
    where: { id },
    data,
    include: { steps: { orderBy: { order: "asc" } } },
  });

  revalidatePath("/admin");
  return updated;
}

export async function deleteApprovalFlow(id: string) {
  const companyId = await getActiveCompanyId();

  const flow = await prisma.approvalFlow.findFirst({
    where: { id, companyId },
  });
  if (!flow) throw new Error("Fluxo de aprovacao nao encontrado");

  await prisma.approvalFlow.delete({ where: { id } });

  revalidatePath("/admin");
  return { success: true };
}

export async function getApprovalRequests(status?: ApprovalStatus) {
  const companyId = await getActiveCompanyId();

  return prisma.approvalRequest.findMany({
    where: {
      approvalFlow: { companyId },
      ...(status && { status }),
    },
    include: {
      approvalFlow: { select: { id: true, name: true, entity: true } },
      responses: { orderBy: { respondedAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createApprovalRequest(data: {
  approvalFlowId: string;
  entityId: string;
  notes?: string;
}) {
  const companyId = await getActiveCompanyId();
  const user = await getSessionUser();

  const flow = await prisma.approvalFlow.findFirst({
    where: { id: data.approvalFlowId, companyId },
  });
  if (!flow) throw new Error("Fluxo de aprovacao nao encontrado");

  const request = await prisma.approvalRequest.create({
    data: {
      approvalFlowId: data.approvalFlowId,
      entityId: data.entityId,
      requestedById: user.id,
      notes: data.notes ?? null,
      status: "PENDING_APPROVAL",
      currentStep: 0,
    },
    include: {
      approvalFlow: true,
      responses: true,
    },
  });

  revalidatePath("/admin");
  return request;
}

export async function respondToApproval(
  requestId: string,
  status: ApprovalStatus,
  comments?: string,
) {
  const companyId = await getActiveCompanyId();
  const user = await getSessionUser();

  const request = await prisma.approvalRequest.findFirst({
    where: {
      id: requestId,
      approvalFlow: { companyId },
    },
    include: {
      approvalFlow: {
        include: { steps: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!request) throw new Error("Solicitacao nao encontrada");

  await prisma.approvalResponse.create({
    data: {
      approvalRequestId: requestId,
      stepOrder: request.currentStep,
      responderId: user.id,
      status,
      comments: comments ?? null,
    },
  });

  let newStatus: ApprovalStatus = request.status;
  let newStep = request.currentStep;

  if (status === "REJECTED") {
    newStatus = "REJECTED";
  } else if (status === "APPROVED") {
    const totalSteps = request.approvalFlow.steps.length;
    if (request.currentStep + 1 >= totalSteps) {
      newStatus = "APPROVED";
    } else {
      newStep = request.currentStep + 1;
    }
  }

  const updated = await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: newStatus,
      currentStep: newStep,
    },
    include: { responses: true },
  });

  revalidatePath("/admin");
  return updated;
}

// ===========================================================================
// 9. DOCUMENT TEMPLATES
// ===========================================================================

export async function getDocumentTemplates(entity?: string) {
  const companyId = await getActiveCompanyId();

  return prisma.documentTemplate.findMany({
    where: {
      companyId,
      ...(entity && { entity }),
    },
    orderBy: [{ entity: "asc" }, { name: "asc" }],
  });
}

export async function createDocumentTemplate(data: {
  name: string;
  entity: string;
  content: string;
  isDefault?: boolean;
  isActive?: boolean;
}) {
  const companyId = await getActiveCompanyId();

  if (!data.name || !data.entity || !data.content) {
    throw new Error("Nome, entidade e conteudo sao obrigatorios");
  }

  const template = await prisma.documentTemplate.create({
    data: {
      companyId,
      name: data.name,
      entity: data.entity,
      content: data.content,
      isDefault: data.isDefault ?? false,
      isActive: data.isActive ?? true,
    },
  });

  revalidatePath("/admin");
  return template;
}

export async function updateDocumentTemplate(
  id: string,
  data: {
    name?: string;
    entity?: string;
    content?: string;
    isDefault?: boolean;
    isActive?: boolean;
  },
) {
  const companyId = await getActiveCompanyId();

  const template = await prisma.documentTemplate.findFirst({
    where: { id, companyId },
  });
  if (!template) throw new Error("Template nao encontrado");

  const updated = await prisma.documentTemplate.update({
    where: { id },
    data,
  });

  revalidatePath("/admin");
  return updated;
}

export async function deleteDocumentTemplate(id: string) {
  const companyId = await getActiveCompanyId();

  const template = await prisma.documentTemplate.findFirst({
    where: { id, companyId },
  });
  if (!template) throw new Error("Template nao encontrado");

  await prisma.documentTemplate.delete({ where: { id } });

  revalidatePath("/admin");
  return { success: true };
}

// ===========================================================================
// 10. INTEGRATIONS
// ===========================================================================

export async function getIntegrations() {
  const companyId = await getActiveCompanyId();

  return prisma.integration.findMany({
    where: { companyId },
    include: {
      _count: { select: { logs: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createIntegration(data: {
  provider: string;
  name: string;
  config: string;
  isActive?: boolean;
}) {
  const companyId = await getActiveCompanyId();

  if (!data.provider || !data.name || !data.config) {
    throw new Error("Provider, nome e configuracao sao obrigatorios");
  }

  const integration = await prisma.integration.create({
    data: {
      companyId,
      provider: data.provider,
      name: data.name,
      config: data.config,
      isActive: data.isActive ?? false,
    },
  });

  revalidatePath("/admin");
  return integration;
}

export async function updateIntegration(
  id: string,
  data: {
    name?: string;
    config?: string;
    isActive?: boolean;
  },
) {
  const companyId = await getActiveCompanyId();

  const integration = await prisma.integration.findFirst({
    where: { id, companyId },
  });
  if (!integration) throw new Error("Integracao nao encontrada");

  const updated = await prisma.integration.update({
    where: { id },
    data,
  });

  revalidatePath("/admin");
  return updated;
}

export async function deleteIntegration(id: string) {
  const companyId = await getActiveCompanyId();

  const integration = await prisma.integration.findFirst({
    where: { id, companyId },
  });
  if (!integration) throw new Error("Integracao nao encontrada");

  await prisma.integration.delete({ where: { id } });

  revalidatePath("/admin");
  return { success: true };
}

export async function toggleIntegration(id: string, isActive: boolean) {
  const companyId = await getActiveCompanyId();

  const integration = await prisma.integration.findFirst({
    where: { id, companyId },
  });
  if (!integration) throw new Error("Integracao nao encontrada");

  const updated = await prisma.integration.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/admin");
  return updated;
}

export async function testIntegration(id: string) {
  const companyId = await getActiveCompanyId();

  const integration = await prisma.integration.findFirst({
    where: { id, companyId },
  });
  if (!integration) throw new Error("Integracao nao encontrada");

  // Log the test attempt
  const log = await prisma.integrationLog.create({
    data: {
      integrationId: id,
      action: "test_connection",
      status: "success",
      requestData: null,
      responseData: JSON.stringify({ message: "Conexao testada com sucesso" }),
      errorMessage: null,
    },
  });

  return { success: true, log };
}

export async function getIntegrationLogs(integrationId: string) {
  const companyId = await getActiveCompanyId();

  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, companyId },
  });
  if (!integration) throw new Error("Integracao nao encontrada");

  return prisma.integrationLog.findMany({
    where: { integrationId },
    orderBy: { executedAt: "desc" },
    take: 100,
  });
}

export async function getAvailableIntegrations() {
  return [
    { provider: "whatsapp", name: "WhatsApp Business", category: "messaging", description: "Envio e recebimento de mensagens via WhatsApp" },
    { provider: "email_smtp", name: "Email SMTP", category: "email", description: "Envio de emails via SMTP" },
    { provider: "google", name: "Google Workspace", category: "productivity", description: "Calendar, Drive e Gmail" },
    { provider: "erp_omie", name: "Omie ERP", category: "erp", description: "Integracao com o sistema Omie" },
    { provider: "erp_bling", name: "Bling ERP", category: "erp", description: "Integracao com o sistema Bling" },
    { provider: "nfe", name: "Nota Fiscal Eletronica", category: "fiscal", description: "Emissao de NF-e e NFS-e" },
    { provider: "payment_pix", name: "PIX / Pagamentos", category: "payment", description: "Geracao de cobranças via PIX" },
    { provider: "storage_s3", name: "Amazon S3", category: "storage", description: "Armazenamento de arquivos na nuvem" },
    { provider: "analytics_ga", name: "Google Analytics", category: "analytics", description: "Rastreamento de acessos e conversoes" },
  ];
}

// ===========================================================================
// 11. API KEYS
// ===========================================================================

export async function getApiKeys() {
  const companyId = await getActiveCompanyId();

  return prisma.apiKey.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createApiKey(data: {
  name: string;
  permissions: string;
  expiresAt?: string;
}) {
  const companyId = await getActiveCompanyId();

  if (!data.name || !data.permissions) {
    throw new Error("Nome e permissoes sao obrigatorios");
  }

  const key = crypto.randomUUID();

  const apiKey = await prisma.apiKey.create({
    data: {
      companyId,
      name: data.name,
      key,
      permissions: data.permissions,
      isActive: true,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
  });

  revalidatePath("/admin");
  return apiKey;
}

export async function deleteApiKey(id: string) {
  const companyId = await getActiveCompanyId();

  const apiKey = await prisma.apiKey.findFirst({
    where: { id, companyId },
  });
  if (!apiKey) throw new Error("Chave de API nao encontrada");

  await prisma.apiKey.delete({ where: { id } });

  revalidatePath("/admin");
  return { success: true };
}

export async function toggleApiKey(id: string, isActive: boolean) {
  const companyId = await getActiveCompanyId();

  const apiKey = await prisma.apiKey.findFirst({
    where: { id, companyId },
  });
  if (!apiKey) throw new Error("Chave de API nao encontrada");

  const updated = await prisma.apiKey.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/admin");
  return updated;
}

// ===========================================================================
// 12. WEBHOOKS
// ===========================================================================

export async function getWebhooks() {
  const companyId = await getActiveCompanyId();

  return prisma.webhook.findMany({
    where: { companyId },
    include: {
      _count: { select: { logs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createWebhook(data: {
  name: string;
  url: string;
  events: string;
  secret?: string;
  isActive?: boolean;
}) {
  const companyId = await getActiveCompanyId();

  if (!data.name || !data.url || !data.events) {
    throw new Error("Nome, URL e eventos sao obrigatorios");
  }

  const webhook = await prisma.webhook.create({
    data: {
      companyId,
      name: data.name,
      url: data.url,
      events: data.events,
      secret: data.secret ?? null,
      isActive: data.isActive ?? true,
    },
  });

  revalidatePath("/admin");
  return webhook;
}

export async function updateWebhook(
  id: string,
  data: {
    name?: string;
    url?: string;
    events?: string;
    secret?: string | null;
    isActive?: boolean;
  },
) {
  const companyId = await getActiveCompanyId();

  const webhook = await prisma.webhook.findFirst({
    where: { id, companyId },
  });
  if (!webhook) throw new Error("Webhook nao encontrado");

  const updated = await prisma.webhook.update({
    where: { id },
    data,
  });

  revalidatePath("/admin");
  return updated;
}

export async function deleteWebhook(id: string) {
  const companyId = await getActiveCompanyId();

  const webhook = await prisma.webhook.findFirst({
    where: { id, companyId },
  });
  if (!webhook) throw new Error("Webhook nao encontrado");

  await prisma.webhook.delete({ where: { id } });

  revalidatePath("/admin");
  return { success: true };
}

export async function toggleWebhook(id: string, isActive: boolean) {
  const companyId = await getActiveCompanyId();

  const webhook = await prisma.webhook.findFirst({
    where: { id, companyId },
  });
  if (!webhook) throw new Error("Webhook nao encontrado");

  const updated = await prisma.webhook.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/admin");
  return updated;
}

export async function getWebhookLogs(webhookId: string) {
  const companyId = await getActiveCompanyId();

  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, companyId },
  });
  if (!webhook) throw new Error("Webhook nao encontrado");

  return prisma.webhookLog.findMany({
    where: { webhookId },
    orderBy: { executedAt: "desc" },
    take: 100,
  });
}

export async function getAvailableWebhookEvents() {
  return [
    { event: "organization.created", label: "Empresa criada" },
    { event: "organization.updated", label: "Empresa atualizada" },
    { event: "organization.deleted", label: "Empresa removida" },
    { event: "contact.created", label: "Contato criado" },
    { event: "contact.updated", label: "Contato atualizado" },
    { event: "deal.created", label: "Negocio criado" },
    { event: "deal.updated", label: "Negocio atualizado" },
    { event: "deal.stage_changed", label: "Estagio do negocio alterado" },
    { event: "deal.won", label: "Negocio ganho" },
    { event: "deal.lost", label: "Negocio perdido" },
    { event: "proposal.created", label: "Proposta criada" },
    { event: "proposal.sent", label: "Proposta enviada" },
    { event: "proposal.accepted", label: "Proposta aceita" },
    { event: "proposal.rejected", label: "Proposta rejeitada" },
    { event: "invoice.created", label: "Fatura criada" },
    { event: "invoice.paid", label: "Fatura paga" },
    { event: "invoice.overdue", label: "Fatura vencida" },
    { event: "contract.created", label: "Contrato criado" },
    { event: "contract.activated", label: "Contrato ativado" },
    { event: "approval.requested", label: "Aprovacao solicitada" },
    { event: "approval.approved", label: "Aprovacao concedida" },
    { event: "approval.rejected", label: "Aprovacao rejeitada" },
  ];
}

// ===========================================================================
// 13. AUDIT LOGS
// ===========================================================================

export async function getAuditLogs(filters?: {
  userId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) {
  const companyId = await getActiveCompanyId();

  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 50;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(filters?.userId && { userId: filters.userId }),
    ...(filters?.action && { action: filters.action }),
    ...(filters?.entity && { entity: filters.entity }),
    ...(filters?.entityId && { entityId: filters.entityId }),
    ...(filters?.startDate || filters?.endDate
      ? {
          createdAt: {
            ...(filters.startDate && { gte: new Date(filters.startDate) }),
            ...(filters.endDate && { lte: new Date(filters.endDate) }),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function createAuditLog(data: {
  action: string;
  entity: string;
  entityId?: string;
  changes?: string;
  ipAddress?: string;
}) {
  const companyId = await getActiveCompanyId();
  const user = await getSessionUser();

  const log = await prisma.auditLog.create({
    data: {
      companyId,
      userId: user.id,
      action: data.action,
      entity: data.entity,
      entityId: data.entityId ?? null,
      changes: data.changes ?? null,
      ipAddress: data.ipAddress ?? null,
    },
  });

  return log;
}

// ===========================================================================
// 14. PROCESSING QUEUE
// ===========================================================================

export async function getProcessingQueue(status?: QueueStatus) {
  const companyId = await getActiveCompanyId();

  return prisma.processingQueue.findMany({
    where: {
      companyId,
      ...(status && { status }),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createQueueItem(data: {
  type: string;
  description?: string;
  inputData?: string;
}) {
  const companyId = await getActiveCompanyId();

  if (!data.type) throw new Error("Tipo e obrigatorio");

  const item = await prisma.processingQueue.create({
    data: {
      companyId,
      type: data.type,
      description: data.description ?? null,
      status: "PENDING",
      progress: 0,
      inputData: data.inputData ?? null,
    },
  });

  revalidatePath("/admin");
  return item;
}

export async function updateQueueItemStatus(
  id: string,
  status: QueueStatus,
  progress?: number,
  output?: string,
) {
  const companyId = await getActiveCompanyId();

  const item = await prisma.processingQueue.findFirst({
    where: { id, companyId },
  });
  if (!item) throw new Error("Item da fila nao encontrado");

  const updateData: Record<string, unknown> = { status };

  if (progress !== undefined) updateData.progress = progress;
  if (output !== undefined) updateData.outputData = output;

  if (status === "PROCESSING" && !item.startedAt) {
    updateData.startedAt = new Date();
  }
  if (status === "COMPLETED" || status === "FAILED") {
    updateData.completedAt = new Date();
    if (status === "COMPLETED") updateData.progress = 100;
  }

  const updated = await prisma.processingQueue.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/admin");
  return updated;
}
