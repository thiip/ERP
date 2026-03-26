"use server";

import { prisma } from "@/lib/prisma";
import { getActiveCompanyId, getSessionUser } from "@/lib/company-context";
import { revalidatePath } from "next/cache";
import type { ProductionStatus } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert Prisma Decimal fields to plain numbers so data can be serialized to client components */
function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => {
      if (
        value !== null &&
        typeof value === "object" &&
        typeof value.toNumber === "function"
      ) {
        return value.toNumber();
      }
      return value;
    })
  );
}

function monthRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

// ---------------------------------------------------------------------------
// Production Orders (existing)
// ---------------------------------------------------------------------------

export async function getProductionOrders() {
  const companyId = await getActiveCompanyId();

  const orders = await prisma.productionOrder.findMany({
    where: { companyId },
    include: {
      company: true,
      _count: { select: { items: true } },
    },
    orderBy: { requestedAt: "desc" },
  });

  return serialize(orders);
}

export async function getUnifiedQueue() {
  const companyId = await getActiveCompanyId();

  const orders = await prisma.productionOrder.findMany({
    where: {
      companyId,
      status: { in: ["PENDING", "QUEUED", "IN_PROGRESS", "PAUSED"] },
    },
    include: {
      company: true,
      items: {
        include: { product: true },
      },
    },
    orderBy: { requestedAt: "asc" },
  });

  return serialize(orders);
}

export async function getProductionOrder(id: string) {
  const companyId = await getActiveCompanyId();

  const order = await prisma.productionOrder.findFirst({
    where: { id, companyId },
    include: {
      company: true,
      items: {
        include: { product: true },
      },
      materials: {
        include: { material: true },
      },
    },
  });

  if (!order) {
    throw new Error("Ordem de produção não encontrada");
  }

  return serialize(order);
}

interface ProductionItemInput {
  productId: string;
  quantity: number;
}

interface ProductionMaterialInput {
  materialId: string;
  requiredQuantity: number;
}

export async function createProductionOrder(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || undefined;
  const priorityStr = formData.get("priority") as string | null;
  const estimatedHoursStr = formData.get("estimatedHours") as string | null;
  const notes = (formData.get("notes") as string) || undefined;
  const itemsJson = formData.get("items") as string;
  const materialsJson = formData.get("materials") as string | null;

  if (!title) {
    throw new Error("Título é obrigatório");
  }
  if (!itemsJson) {
    throw new Error("Itens são obrigatórios");
  }

  let items: ProductionItemInput[];
  try {
    items = JSON.parse(itemsJson);
  } catch {
    throw new Error("Formato de itens inválido");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Pelo menos um item é obrigatório");
  }

  let materials: ProductionMaterialInput[] = [];
  if (materialsJson) {
    try {
      materials = JSON.parse(materialsJson);
    } catch {
      throw new Error("Formato de materiais inválido");
    }
    if (!Array.isArray(materials)) {
      throw new Error("Materiais devem ser uma lista");
    }
  }

  // Validate all item products belong to the company
  const itemProductIds = items.map((i) => i.productId);
  const itemProducts = await prisma.product.findMany({
    where: { id: { in: itemProductIds }, companyId },
  });
  if (itemProducts.length !== itemProductIds.length) {
    throw new Error("Um ou mais produtos não foram encontrados");
  }

  // Validate all material products belong to the company
  if (materials.length > 0) {
    const materialIds = materials.map((m) => m.materialId);
    const materialProducts = await prisma.product.findMany({
      where: { id: { in: materialIds }, companyId },
    });
    if (materialProducts.length !== materialIds.length) {
      throw new Error("Um ou mais materiais não foram encontrados");
    }
  }

  // Generate order number: OP-YYYYMMDD-sequential
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `OP-${dateStr}-`;

  const lastOrder = await prisma.productionOrder.findFirst({
    where: {
      companyId,
      orderNumber: { startsWith: prefix },
    },
    orderBy: { orderNumber: "desc" },
  });

  let sequential = 1;
  if (lastOrder) {
    const lastSeq = parseInt(lastOrder.orderNumber.replace(prefix, ""), 10);
    if (!isNaN(lastSeq)) {
      sequential = lastSeq + 1;
    }
  }
  const orderNumber = `${prefix}${String(sequential).padStart(3, "0")}`;

  const order = await prisma.productionOrder.create({
    data: {
      companyId,
      orderNumber,
      title,
      description,
      priority: priorityStr ? parseInt(priorityStr, 10) : 0,
      status: "PENDING",
      estimatedHours: estimatedHoursStr
        ? parseFloat(estimatedHoursStr)
        : undefined,
      notes,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      },
      materials: {
        create: materials.map((mat) => ({
          materialId: mat.materialId,
          requiredQuantity: mat.requiredQuantity,
        })),
      },
    },
    include: {
      company: true,
      items: { include: { product: true } },
      materials: { include: { material: true } },
    },
  });

  // Check material stock levels and create alerts / auto purchase orders
  if (materials.length > 0) {
    const materialIds = materials.map((m) => m.materialId);
    const materialProducts = await prisma.product.findMany({
      where: { id: { in: materialIds }, companyId },
    });

    const deficitItems: {
      product: (typeof materialProducts)[number];
      deficit: number;
    }[] = [];

    for (const mat of materials) {
      const product = materialProducts.find((p) => p.id === mat.materialId);
      if (!product) continue;

      const currentStock = Number(product.currentStock);
      const requiredQty = mat.requiredQuantity;

      if (requiredQty > currentStock) {
        const alertType = currentStock === 0 ? "OUT_OF_STOCK" : "LOW_STOCK";
        const deficit = requiredQty - currentStock;

        await prisma.materialAlert.create({
          data: {
            companyId,
            productId: product.id,
            type: alertType,
            message:
              alertType === "OUT_OF_STOCK"
                ? `Material "${product.name}" sem estoque para ordem de produção ${orderNumber}. Necessário: ${requiredQty} ${product.unit}`
                : `Estoque insuficiente de "${product.name}" para ordem de produção ${orderNumber}. Disponível: ${currentStock} ${product.unit}, necessário: ${requiredQty} ${product.unit}`,
          },
        });

        deficitItems.push({ product, deficit });
      }
    }

    // Auto-create purchase order for deficit materials
    if (deficitItems.length > 0) {
      await prisma.purchaseOrder.create({
        data: {
          companyId,
          supplierName: "A definir",
          status: "DRAFT",
          autoGenerated: true,
          totalValue: 0,
          items: {
            create: deficitItems.map((d) => ({
              productId: d.product.id,
              quantity: d.deficit,
              unitPrice: Number(d.product.costPrice) || 0,
            })),
          },
        },
      });
    }
  }

  revalidatePath("/production");
  revalidatePath("/inventory");
  return serialize(order);
}

export async function updateProductionOrderStatus(
  id: string,
  status: ProductionStatus
) {
  const companyId = await getActiveCompanyId();
  const user = await getSessionUser();

  const order = await prisma.productionOrder.findFirst({
    where: { id, companyId },
    include: {
      items: { include: { product: true } },
      materials: { include: { material: true } },
    },
  });

  if (!order) {
    throw new Error("Ordem de produção não encontrada");
  }

  switch (status) {
    case "QUEUED": {
      await prisma.productionOrder.update({
        where: { id },
        data: { status: "QUEUED" },
      });
      break;
    }

    case "IN_PROGRESS": {
      await prisma.$transaction(async (tx) => {
        await tx.productionOrder.update({
          where: { id },
          data: { status: "IN_PROGRESS", startedAt: new Date() },
        });

        // Consume materials from stock
        for (const mat of order.materials) {
          const material = mat.material;
          const previousStock = Number(material.currentStock);
          const consumeQty = Number(mat.requiredQuantity);
          const newStock = Math.max(0, previousStock - consumeQty);

          await tx.stockMovement.create({
            data: {
              productId: material.id,
              companyId,
              type: "PRODUCTION_CONSUME",
              quantity: consumeQty,
              previousStock,
              newStock,
              referenceType: "PRODUCTION_ORDER",
              referenceId: order.id,
              notes: `Consumo para ordem de produção ${order.orderNumber}`,
              userId: user.id,
            },
          });

          await tx.product.update({
            where: { id: material.id },
            data: { currentStock: newStock },
          });

          await tx.productionOrderMaterial.update({
            where: { id: mat.id },
            data: { consumedQuantity: consumeQty },
          });
        }
      });
      break;
    }

    case "PAUSED": {
      await prisma.productionOrder.update({
        where: { id },
        data: { status: "PAUSED" },
      });
      break;
    }

    case "COMPLETED": {
      await prisma.$transaction(async (tx) => {
        await tx.productionOrder.update({
          where: { id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });

        // Output finished products to stock
        for (const item of order.items) {
          const product = item.product;
          const previousStock = Number(product.currentStock);
          const producedQty = Number(item.quantity);
          const newStock = previousStock + producedQty;

          await tx.stockMovement.create({
            data: {
              productId: product.id,
              companyId,
              type: "PRODUCTION_OUTPUT",
              quantity: producedQty,
              previousStock,
              newStock,
              referenceType: "PRODUCTION_ORDER",
              referenceId: order.id,
              notes: `Produção concluída - ordem ${order.orderNumber}`,
              userId: user.id,
            },
          });

          await tx.product.update({
            where: { id: product.id },
            data: { currentStock: newStock },
          });

          await tx.productionOrderItem.update({
            where: { id: item.id },
            data: { completedQuantity: producedQty },
          });
        }
      });
      break;
    }

    case "CANCELLED": {
      await prisma.productionOrder.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      break;
    }

    default:
      throw new Error("Status inválido");
  }

  revalidatePath("/production");
  revalidatePath("/inventory");
}

export async function deleteProductionOrder(id: string) {
  const companyId = await getActiveCompanyId();

  const order = await prisma.productionOrder.findFirst({
    where: { id, companyId },
  });

  if (!order) {
    throw new Error("Ordem de produção não encontrada");
  }

  if (order.status !== "PENDING") {
    throw new Error(
      "Apenas ordens de produção com status PENDENTE podem ser excluídas"
    );
  }

  await prisma.productionOrder.delete({ where: { id } });

  revalidatePath("/production");
}

// ---------------------------------------------------------------------------
// Enhanced Production Orders - Filtered Query
// ---------------------------------------------------------------------------

interface ProductionOrderFilters {
  status?: ProductionStatus | ProductionStatus[];
  dateFrom?: string; // ISO date
  dateTo?: string; // ISO date
  search?: string;
}

export async function getProductionOrdersFiltered(
  filters: ProductionOrderFilters
) {
  const companyId = await getActiveCompanyId();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { companyId };

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      where.status = { in: filters.status };
    } else {
      where.status = filters.status;
    }
  }

  if (filters.dateFrom || filters.dateTo) {
    where.requestedAt = {};
    if (filters.dateFrom) {
      where.requestedAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.requestedAt.lte = new Date(filters.dateTo);
    }
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { orderNumber: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const orders = await prisma.productionOrder.findMany({
    where,
    include: {
      company: true,
      items: { include: { product: true } },
      _count: { select: { items: true, materials: true } },
    },
    orderBy: { requestedAt: "desc" },
  });

  return serialize(orders);
}

// ---------------------------------------------------------------------------
// Report Production (partial production reporting)
// ---------------------------------------------------------------------------

export async function reportProduction(
  orderId: string,
  itemId: string,
  quantity: number
) {
  const companyId = await getActiveCompanyId();
  const user = await getSessionUser();

  if (quantity <= 0) {
    throw new Error("Quantidade deve ser maior que zero");
  }

  const order = await prisma.productionOrder.findFirst({
    where: { id: orderId, companyId },
  });

  if (!order) {
    throw new Error("Ordem de produção não encontrada");
  }

  if (order.status !== "IN_PROGRESS") {
    throw new Error(
      "Só é possível reportar produção para ordens em andamento"
    );
  }

  const item = await prisma.productionOrderItem.findFirst({
    where: { id: itemId, productionOrderId: orderId },
    include: { product: true },
  });

  if (!item) {
    throw new Error("Item da ordem de produção não encontrado");
  }

  const currentCompleted = Number(item.completedQuantity);
  const totalRequired = Number(item.quantity);
  const newCompleted = currentCompleted + quantity;

  if (newCompleted > totalRequired) {
    throw new Error(
      `Quantidade reportada excede o total. Máximo permitido: ${totalRequired - currentCompleted} ${item.product.unit}`
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update completed quantity on the item
    const updatedItem = await tx.productionOrderItem.update({
      where: { id: itemId },
      data: { completedQuantity: newCompleted },
    });

    // Add to product stock
    const product = item.product;
    const previousStock = Number(product.currentStock);
    const newStock = previousStock + quantity;

    await tx.stockMovement.create({
      data: {
        productId: product.id,
        companyId,
        type: "PRODUCTION_OUTPUT",
        quantity,
        previousStock,
        newStock,
        referenceType: "PRODUCTION_ORDER",
        referenceId: orderId,
        notes: `Reporte parcial de produção - ordem ${order.orderNumber} (${newCompleted}/${totalRequired})`,
        userId: user.id,
      },
    });

    await tx.product.update({
      where: { id: product.id },
      data: { currentStock: newStock },
    });

    return updatedItem;
  });

  revalidatePath("/production");
  revalidatePath("/inventory");
  return serialize(result);
}

// ---------------------------------------------------------------------------
// Report By-Product (with optional lot creation)
// ---------------------------------------------------------------------------

export async function reportByProduct(
  orderId: string,
  productId: string,
  quantity: number,
  lotNumber?: string
) {
  const companyId = await getActiveCompanyId();
  const user = await getSessionUser();

  if (quantity <= 0) {
    throw new Error("Quantidade deve ser maior que zero");
  }

  const order = await prisma.productionOrder.findFirst({
    where: { id: orderId, companyId },
  });

  if (!order) {
    throw new Error("Ordem de produção não encontrada");
  }

  if (order.status !== "IN_PROGRESS" && order.status !== "COMPLETED") {
    throw new Error(
      "Só é possível reportar produção para ordens em andamento ou concluídas"
    );
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
  });

  if (!product) {
    throw new Error("Produto não encontrado");
  }

  const result = await prisma.$transaction(async (tx) => {
    let lotId: string | undefined;

    // Create or update lot if lotNumber provided
    if (lotNumber) {
      const existingLot = await tx.productLot.findUnique({
        where: {
          companyId_productId_lotNumber: {
            companyId,
            productId,
            lotNumber,
          },
        },
      });

      if (existingLot) {
        await tx.productLot.update({
          where: { id: existingLot.id },
          data: { quantity: Number(existingLot.quantity) + quantity },
        });
        lotId = existingLot.id;
      } else {
        const newLot = await tx.productLot.create({
          data: {
            companyId,
            productId,
            lotNumber,
            quantity,
            manufacturingDate: new Date(),
            notes: `Lote criado via ordem de produção ${order.orderNumber}`,
          },
        });
        lotId = newLot.id;
      }
    }

    // Update product stock
    const previousStock = Number(product.currentStock);
    const newStock = previousStock + quantity;

    await tx.stockMovement.create({
      data: {
        productId,
        companyId,
        type: "PRODUCTION_OUTPUT",
        quantity,
        previousStock,
        newStock,
        referenceType: "PRODUCTION_ORDER",
        referenceId: orderId,
        notes: `Produção reportada - ordem ${order.orderNumber}${lotNumber ? ` - Lote: ${lotNumber}` : ""}`,
        userId: user.id,
        lotId,
      },
    });

    await tx.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
    });

    // Also update the production order item if it matches
    const orderItem = await tx.productionOrderItem.findFirst({
      where: { productionOrderId: orderId, productId },
    });

    if (orderItem) {
      const newCompleted = Number(orderItem.completedQuantity) + quantity;
      await tx.productionOrderItem.update({
        where: { id: orderItem.id },
        data: { completedQuantity: Math.min(newCompleted, Number(orderItem.quantity)) },
      });
    }

    return { productId, quantity, lotId, lotNumber };
  });

  revalidatePath("/production");
  revalidatePath("/inventory");
  return serialize(result);
}

// ---------------------------------------------------------------------------
// Production Report (monthly summary)
// ---------------------------------------------------------------------------

export async function getProductionReport(month: number, year: number) {
  const companyId = await getActiveCompanyId();
  const { start, end } = monthRange(month, year);

  const [allOrders, completedOrders, inProgressOrders, outputMovements] =
    await Promise.all([
      prisma.productionOrder.count({
        where: {
          companyId,
          requestedAt: { gte: start, lt: end },
        },
      }),
      prisma.productionOrder.count({
        where: {
          companyId,
          status: "COMPLETED",
          completedAt: { gte: start, lt: end },
        },
      }),
      prisma.productionOrder.count({
        where: {
          companyId,
          status: "IN_PROGRESS",
          requestedAt: { gte: start, lt: end },
        },
      }),
      prisma.stockMovement.findMany({
        where: {
          companyId,
          type: "PRODUCTION_OUTPUT",
          createdAt: { gte: start, lt: end },
        },
        select: { quantity: true },
      }),
    ]);

  const totalUnitsProduced = outputMovements.reduce(
    (sum, m) => sum + Number(m.quantity),
    0
  );

  return serialize({
    month,
    year,
    totalOrders: allOrders,
    completedOrders,
    inProgressOrders,
    cancelledOrders:
      allOrders - completedOrders - inProgressOrders,
    totalUnitsProduced,
  });
}

// ---------------------------------------------------------------------------
// Material Alerts (existing)
// ---------------------------------------------------------------------------

export async function getAlerts() {
  const companyId = await getActiveCompanyId();

  const alerts = await prisma.materialAlert.findMany({
    where: { companyId, isResolved: false },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  return serialize(alerts);
}

export async function resolveAlert(id: string) {
  const companyId = await getActiveCompanyId();

  const alert = await prisma.materialAlert.findFirst({
    where: { id, companyId },
  });

  if (!alert) {
    throw new Error("Alerta não encontrado");
  }

  await prisma.materialAlert.update({
    where: { id },
    data: { isResolved: true, resolvedAt: new Date() },
  });

  revalidatePath("/production");
  revalidatePath("/inventory");
}

// ---------------------------------------------------------------------------
// Production Routing (Roteiro de Produção)
// ---------------------------------------------------------------------------

export async function getProductionRouting(productId: string) {
  const companyId = await getActiveCompanyId();

  // Validate product belongs to company
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
  });

  if (!product) {
    throw new Error("Produto não encontrado");
  }

  const steps = await prisma.productionRouting.findMany({
    where: { companyId, productId },
    orderBy: { stepNumber: "asc" },
  });

  return serialize(steps);
}

export async function addRoutingStep(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const productId = formData.get("productId") as string;
  const stepNumberStr = formData.get("stepNumber") as string;
  const operation = formData.get("operation") as string;
  const workCenter = (formData.get("workCenter") as string) || undefined;
  const setupTimeStr = formData.get("setupTime") as string | null;
  const processTimeStr = formData.get("processTime") as string | null;
  const description = (formData.get("description") as string) || undefined;

  if (!productId) {
    throw new Error("Produto é obrigatório");
  }
  if (!operation) {
    throw new Error("Operação é obrigatória");
  }

  // Validate product
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
  });

  if (!product) {
    throw new Error("Produto não encontrado");
  }

  // Determine step number
  let stepNumber: number;
  if (stepNumberStr) {
    stepNumber = parseInt(stepNumberStr, 10);
  } else {
    // Auto-assign next step number
    const lastStep = await prisma.productionRouting.findFirst({
      where: { companyId, productId },
      orderBy: { stepNumber: "desc" },
    });
    stepNumber = lastStep ? lastStep.stepNumber + 10 : 10;
  }

  // Check for duplicate step number
  const existing = await prisma.productionRouting.findUnique({
    where: {
      companyId_productId_stepNumber: { companyId, productId, stepNumber },
    },
  });

  if (existing) {
    throw new Error(
      `Já existe uma etapa com o número ${stepNumber} para este produto`
    );
  }

  const step = await prisma.productionRouting.create({
    data: {
      companyId,
      productId,
      stepNumber,
      operation,
      workCenter,
      setupTime: setupTimeStr ? parseFloat(setupTimeStr) : undefined,
      processTime: processTimeStr ? parseFloat(processTimeStr) : undefined,
      description,
    },
  });

  revalidatePath("/production");
  return serialize(step);
}

export async function updateRoutingStep(id: string, formData: FormData) {
  const companyId = await getActiveCompanyId();

  const step = await prisma.productionRouting.findFirst({
    where: { id, companyId },
  });

  if (!step) {
    throw new Error("Etapa do roteiro não encontrada");
  }

  const operation = formData.get("operation") as string | null;
  const workCenter = formData.get("workCenter") as string | null;
  const setupTimeStr = formData.get("setupTime") as string | null;
  const processTimeStr = formData.get("processTime") as string | null;
  const description = formData.get("description") as string | null;
  const stepNumberStr = formData.get("stepNumber") as string | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};

  if (operation !== null) data.operation = operation;
  if (workCenter !== null) data.workCenter = workCenter || undefined;
  if (setupTimeStr !== null)
    data.setupTime = setupTimeStr ? parseFloat(setupTimeStr) : null;
  if (processTimeStr !== null)
    data.processTime = processTimeStr ? parseFloat(processTimeStr) : null;
  if (description !== null) data.description = description || undefined;
  if (stepNumberStr !== null) data.stepNumber = parseInt(stepNumberStr, 10);

  const updated = await prisma.productionRouting.update({
    where: { id },
    data,
  });

  revalidatePath("/production");
  return serialize(updated);
}

export async function deleteRoutingStep(
  companyId: string,
  productId: string,
  stepNumber: number
) {
  const activeCompanyId = await getActiveCompanyId();

  if (companyId !== activeCompanyId) {
    throw new Error("Empresa não autorizada");
  }

  const step = await prisma.productionRouting.findUnique({
    where: {
      companyId_productId_stepNumber: { companyId, productId, stepNumber },
    },
  });

  if (!step) {
    throw new Error("Etapa do roteiro não encontrada");
  }

  await prisma.productionRouting.delete({ where: { id: step.id } });

  // Renumber remaining steps sequentially (10, 20, 30, ...)
  const remainingSteps = await prisma.productionRouting.findMany({
    where: { companyId, productId },
    orderBy: { stepNumber: "asc" },
  });

  for (let i = 0; i < remainingSteps.length; i++) {
    const newStepNumber = (i + 1) * 10;
    if (remainingSteps[i].stepNumber !== newStepNumber) {
      await prisma.productionRouting.update({
        where: { id: remainingSteps[i].id },
        data: { stepNumber: newStepNumber },
      });
    }
  }

  revalidatePath("/production");
}

export async function copyRouting(
  fromProductId: string,
  toProductId: string
) {
  const companyId = await getActiveCompanyId();

  // Validate both products belong to company
  const [fromProduct, toProduct] = await Promise.all([
    prisma.product.findFirst({
      where: { id: fromProductId, companyId },
    }),
    prisma.product.findFirst({
      where: { id: toProductId, companyId },
    }),
  ]);

  if (!fromProduct) {
    throw new Error("Produto de origem não encontrado");
  }
  if (!toProduct) {
    throw new Error("Produto de destino não encontrado");
  }

  // Get source routing
  const sourceSteps = await prisma.productionRouting.findMany({
    where: { companyId, productId: fromProductId },
    orderBy: { stepNumber: "asc" },
  });

  if (sourceSteps.length === 0) {
    throw new Error("Produto de origem não possui roteiro de produção");
  }

  // Delete existing routing for destination product
  await prisma.productionRouting.deleteMany({
    where: { companyId, productId: toProductId },
  });

  // Copy steps
  const createdSteps = await Promise.all(
    sourceSteps.map((step) =>
      prisma.productionRouting.create({
        data: {
          companyId,
          productId: toProductId,
          stepNumber: step.stepNumber,
          operation: step.operation,
          workCenter: step.workCenter,
          setupTime: step.setupTime,
          processTime: step.processTime,
          description: step.description,
        },
      })
    )
  );

  revalidatePath("/production");
  return serialize(createdSteps);
}

// ---------------------------------------------------------------------------
// MRP (Material Requirements Planning)
// ---------------------------------------------------------------------------

interface MRPLine {
  materialId: string;
  materialName: string;
  materialSku: string | null;
  unit: string;
  requiredQuantity: number;
  inStock: number;
  deficit: number;
  inPurchaseOrders: number;
}

export async function calculateMRP(productId: string, quantity: number) {
  const companyId = await getActiveCompanyId();

  if (quantity <= 0) {
    throw new Error("Quantidade deve ser maior que zero");
  }

  // Validate product
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
  });

  if (!product) {
    throw new Error("Produto não encontrado");
  }

  // Get BOM for this product
  const bom = await prisma.billOfMaterial.findMany({
    where: { companyId, productId, isOptional: false },
    include: { material: true },
    orderBy: { order: "asc" },
  });

  if (bom.length === 0) {
    throw new Error(
      "Produto não possui lista de materiais (BOM) cadastrada"
    );
  }

  // Get pending purchase order quantities for these materials
  const materialIds = bom.map((b) => b.materialId);
  const pendingPOItems = await prisma.purchaseOrderItem.findMany({
    where: {
      productId: { in: materialIds },
      purchaseOrder: {
        companyId,
        status: { in: ["DRAFT", "SENT", "PARTIAL"] },
      },
    },
    select: { productId: true, quantity: true, receivedQuantity: true },
  });

  // Aggregate pending PO quantities per material
  const pendingByMaterial: Record<string, number> = {};
  for (const poItem of pendingPOItems) {
    const pending =
      Number(poItem.quantity) - Number(poItem.receivedQuantity);
    pendingByMaterial[poItem.productId] =
      (pendingByMaterial[poItem.productId] || 0) + Math.max(0, pending);
  }

  const lines: MRPLine[] = bom.map((bomItem) => {
    const bomQty = Number(bomItem.quantity);
    const lossPercent = Number(bomItem.lossPercent);
    const requiredQuantity = bomQty * (1 + lossPercent / 100) * quantity;
    const inStock = Number(bomItem.material.currentStock);
    const inPurchaseOrders = pendingByMaterial[bomItem.materialId] || 0;
    const deficit = Math.max(0, requiredQuantity - inStock);

    return {
      materialId: bomItem.materialId,
      materialName: bomItem.material.name,
      materialSku: bomItem.material.sku,
      unit: bomItem.material.unit,
      requiredQuantity: Math.round(requiredQuantity * 10000) / 10000,
      inStock,
      deficit: Math.round(deficit * 10000) / 10000,
      inPurchaseOrders,
    };
  });

  return serialize({
    productId,
    productName: product.name,
    desiredQuantity: quantity,
    materials: lines,
    totalDeficitItems: lines.filter((l) => l.deficit > 0).length,
  });
}

export async function generateMRPPlan(
  items: { productId: string; quantity: number }[]
) {
  const companyId = await getActiveCompanyId();

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Pelo menos um item é obrigatório para o plano MRP");
  }

  // Validate all products
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, companyId },
  });

  if (products.length !== productIds.length) {
    throw new Error("Um ou mais produtos não foram encontrados");
  }

  // Get all BOMs for all products
  const boms = await prisma.billOfMaterial.findMany({
    where: {
      companyId,
      productId: { in: productIds },
      isOptional: false,
    },
    include: { material: true },
  });

  // Aggregate material needs across all products
  const aggregated: Record<
    string,
    {
      materialId: string;
      materialName: string;
      materialSku: string | null;
      unit: string;
      requiredQuantity: number;
      inStock: number;
    }
  > = {};

  for (const item of items) {
    const productBom = boms.filter((b) => b.productId === item.productId);

    for (const bomItem of productBom) {
      const bomQty = Number(bomItem.quantity);
      const lossPercent = Number(bomItem.lossPercent);
      const required = bomQty * (1 + lossPercent / 100) * item.quantity;

      if (!aggregated[bomItem.materialId]) {
        aggregated[bomItem.materialId] = {
          materialId: bomItem.materialId,
          materialName: bomItem.material.name,
          materialSku: bomItem.material.sku,
          unit: bomItem.material.unit,
          requiredQuantity: 0,
          inStock: Number(bomItem.material.currentStock),
        };
      }

      aggregated[bomItem.materialId].requiredQuantity += required;
    }
  }

  // Get pending PO quantities
  const materialIds = Object.keys(aggregated);
  const pendingPOItems = await prisma.purchaseOrderItem.findMany({
    where: {
      productId: { in: materialIds },
      purchaseOrder: {
        companyId,
        status: { in: ["DRAFT", "SENT", "PARTIAL"] },
      },
    },
    select: { productId: true, quantity: true, receivedQuantity: true },
  });

  const pendingByMaterial: Record<string, number> = {};
  for (const poItem of pendingPOItems) {
    const pending =
      Number(poItem.quantity) - Number(poItem.receivedQuantity);
    pendingByMaterial[poItem.productId] =
      (pendingByMaterial[poItem.productId] || 0) + Math.max(0, pending);
  }

  const lines: MRPLine[] = Object.values(aggregated).map((mat) => {
    const deficit = Math.max(0, mat.requiredQuantity - mat.inStock);
    return {
      materialId: mat.materialId,
      materialName: mat.materialName,
      materialSku: mat.materialSku,
      unit: mat.unit,
      requiredQuantity: Math.round(mat.requiredQuantity * 10000) / 10000,
      inStock: mat.inStock,
      deficit: Math.round(deficit * 10000) / 10000,
      inPurchaseOrders: pendingByMaterial[mat.materialId] || 0,
    };
  });

  return serialize({
    items: items.map((i) => ({
      productId: i.productId,
      productName: products.find((p) => p.id === i.productId)?.name,
      quantity: i.quantity,
    })),
    materials: lines,
    totalDeficitItems: lines.filter((l) => l.deficit > 0).length,
  });
}

export async function executeMRPPlan(
  items: { materialId: string; quantity: number }[]
) {
  const companyId = await getActiveCompanyId();

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(
      "Pelo menos um material é obrigatório para executar o plano MRP"
    );
  }

  // Validate all materials belong to company
  const materialIds = items.map((i) => i.materialId);
  const materials = await prisma.product.findMany({
    where: { id: { in: materialIds }, companyId },
  });

  if (materials.length !== materialIds.length) {
    throw new Error("Um ou mais materiais não foram encontrados");
  }

  // Create purchase order with all deficit items
  const purchaseOrder = await prisma.purchaseOrder.create({
    data: {
      companyId,
      supplierName: "A definir",
      status: "DRAFT",
      autoGenerated: true,
      totalValue: items.reduce((sum, item) => {
        const material = materials.find((m) => m.id === item.materialId);
        return sum + item.quantity * (Number(material?.costPrice) || 0);
      }, 0),
      items: {
        create: items.map((item) => {
          const material = materials.find((m) => m.id === item.materialId);
          return {
            productId: item.materialId,
            quantity: item.quantity,
            unitPrice: Number(material?.costPrice) || 0,
          };
        }),
      },
    },
    include: {
      items: { include: { product: true } },
    },
  });

  revalidatePath("/production");
  revalidatePath("/inventory");
  return serialize(purchaseOrder);
}

// ---------------------------------------------------------------------------
// Production Dashboard
// ---------------------------------------------------------------------------

export async function getProductionDashboard() {
  const companyId = await getActiveCompanyId();

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayOfNextMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  );

  const [
    ordersByStatusRaw,
    thisMonthCompleted,
    recentOrders,
    activeOrderMaterials,
    allActiveOrders,
  ] = await Promise.all([
    // Count orders by status
    prisma.productionOrder.groupBy({
      by: ["status"],
      where: { companyId },
      _count: { id: true },
    }),

    // Completed orders this month
    prisma.productionOrder.count({
      where: {
        companyId,
        status: "COMPLETED",
        completedAt: { gte: firstDayOfMonth, lt: firstDayOfNextMonth },
      },
    }),

    // Recent 10 orders with items
    prisma.productionOrder.findMany({
      where: { companyId },
      include: {
        items: { include: { product: true } },
        _count: { select: { materials: true } },
      },
      orderBy: { requestedAt: "desc" },
      take: 10,
    }),

    // Materials for active orders (to find deficits)
    prisma.productionOrderMaterial.findMany({
      where: {
        productionOrder: {
          companyId,
          status: { in: ["PENDING", "QUEUED", "IN_PROGRESS"] },
        },
      },
      include: { material: true },
    }),

    // Active orders for efficiency calculation
    prisma.productionOrder.findMany({
      where: {
        companyId,
        status: "COMPLETED",
        completedAt: { gte: firstDayOfMonth, lt: firstDayOfNextMonth },
      },
      select: {
        estimatedHours: true,
        startedAt: true,
        completedAt: true,
      },
    }),
  ]);

  // Transform ordersByStatus into a map
  const ordersByStatus: Record<string, number> = {};
  for (const row of ordersByStatusRaw) {
    ordersByStatus[row.status] = row._count.id;
  }

  // Calculate pending materials (materials with deficit)
  const materialDeficits: Record<
    string,
    { materialId: string; materialName: string; required: number; inStock: number; deficit: number }
  > = {};

  for (const mat of activeOrderMaterials) {
    const required = Number(mat.requiredQuantity);
    const consumed = Number(mat.consumedQuantity);
    const remaining = required - consumed;

    if (remaining > 0) {
      const inStock = Number(mat.material.currentStock);
      if (remaining > inStock) {
        const key = mat.materialId;
        if (!materialDeficits[key]) {
          materialDeficits[key] = {
            materialId: mat.materialId,
            materialName: mat.material.name,
            required: 0,
            inStock,
            deficit: 0,
          };
        }
        materialDeficits[key].required += remaining;
        materialDeficits[key].deficit += remaining - inStock;
      }
    }
  }

  // Production efficiency: completed on time vs late
  let onTime = 0;
  let late = 0;
  for (const order of allActiveOrders) {
    if (order.estimatedHours && order.startedAt && order.completedAt) {
      const estimatedMs =
        Number(order.estimatedHours) * 60 * 60 * 1000;
      const actualMs =
        order.completedAt.getTime() - order.startedAt.getTime();
      if (actualMs <= estimatedMs * 1.1) {
        // 10% tolerance
        onTime++;
      } else {
        late++;
      }
    }
  }

  return serialize({
    ordersByStatus,
    thisMonthProduction: thisMonthCompleted,
    pendingMaterials: Object.values(materialDeficits),
    recentOrders,
    productionEfficiency: {
      onTime,
      late,
      total: onTime + late,
      percentOnTime:
        onTime + late > 0
          ? Math.round((onTime / (onTime + late)) * 100)
          : 100,
    },
  });
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export async function generateProductionLabel(orderId: string) {
  const companyId = await getActiveCompanyId();

  const order = await prisma.productionOrder.findFirst({
    where: { id: orderId, companyId },
    include: {
      company: true,
      items: {
        include: { product: true },
      },
    },
  });

  if (!order) {
    throw new Error("Ordem de produção não encontrada");
  }

  const labelData = {
    orderNumber: order.orderNumber,
    title: order.title,
    companyName: order.company.name,
    status: order.status,
    requestedAt: order.requestedAt.toISOString(),
    startedAt: order.startedAt?.toISOString() || null,
    completedAt: order.completedAt?.toISOString() || null,
    items: order.items.map((item) => ({
      productName: item.product.name,
      productSku: item.product.sku,
      productBarcode: item.product.barcode,
      quantity: Number(item.quantity),
      completedQuantity: Number(item.completedQuantity),
      unit: item.product.unit,
    })),
    barcode: order.orderNumber, // Use order number as barcode value
    printedAt: new Date().toISOString(),
  };

  return serialize(labelData);
}
