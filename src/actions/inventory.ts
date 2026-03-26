"use server";

import { prisma } from "@/lib/prisma";
import { getActiveCompanyId, getSessionUser } from "@/lib/company-context";
import { revalidatePath } from "next/cache";
import type {
  ProductType,
  MovementType,
  PurchaseOrderStatus,
  InventoryCountStatus,
  RequisitionStatus,
} from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) => {
      if (value !== null && typeof value === "object" && typeof value.toNumber === "function") {
        return value.toNumber();
      }
      return value;
    })
  );
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function getProducts() {
  const companyId = await getActiveCompanyId();

  const products = await prisma.product.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });

  return serialize(products);
}

export async function getProduct(id: string) {
  const companyId = await getActiveCompanyId();

  const product = await prisma.product.findFirst({
    where: { id, companyId },
    include: {
      movements: {
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      defaultSector: true,
      lots: { where: { isActive: true }, orderBy: { createdAt: "desc" } },
      sectorStocks: { include: { sector: true } },
      bomParent: {
        include: { material: { select: { id: true, name: true, sku: true, unit: true } } },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!product) {
    throw new Error("Produto não encontrado");
  }

  return serialize(product);
}

export async function getProductsByType(type: ProductType) {
  const companyId = await getActiveCompanyId();

  const products = await prisma.product.findMany({
    where: { companyId, type, isActive: true },
    orderBy: { name: "asc" },
  });

  return serialize(products);
}

export async function getProductSummary() {
  const companyId = await getActiveCompanyId();

  const products = await prisma.product.findMany({
    where: { companyId, isActive: true },
    select: {
      type: true,
      currentStock: true,
      minimumStock: true,
      costPrice: true,
    },
  });

  const countsByType: Record<string, number> = {};
  let lowStockCount = 0;
  let totalValue = 0;

  for (const p of products) {
    countsByType[p.type] = (countsByType[p.type] || 0) + 1;

    const current = Number(p.currentStock);
    const minimum = Number(p.minimumStock);
    if (current <= minimum && minimum > 0) {
      lowStockCount++;
    }

    if (p.costPrice) {
      totalValue += current * Number(p.costPrice);
    }
  }

  return {
    totalProducts: products.length,
    countsByType,
    lowStockCount,
    totalValue,
  };
}

export async function createProduct(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string;
  const description = (formData.get("description") as string) || undefined;
  const type = (formData.get("type") as ProductType) || "FINISHED_PRODUCT";
  const unit = (formData.get("unit") as string) || "unidade";
  const minimumStockStr = formData.get("minimumStock") as string | null;
  const maximumStockStr = formData.get("maximumStock") as string | null;
  const reorderPointStr = formData.get("reorderPoint") as string | null;
  const costPriceStr = formData.get("costPrice") as string | null;
  const salePriceStr = formData.get("salePrice") as string | null;
  const barcode = (formData.get("barcode") as string) || undefined;
  const group = (formData.get("group") as string) || undefined;
  const family = (formData.get("family") as string) || undefined;
  const brand = (formData.get("brand") as string) || undefined;
  const secondaryUnit = (formData.get("secondaryUnit") as string) || undefined;
  const conversionFactorStr = formData.get("conversionFactor") as string | null;
  const weightStr = formData.get("weight") as string | null;
  const widthStr = formData.get("width") as string | null;
  const heightStr = formData.get("height") as string | null;
  const depthStr = formData.get("depth") as string | null;
  const ncm = (formData.get("ncm") as string) || undefined;
  const cest = (formData.get("cest") as string) || undefined;
  const cfop = (formData.get("cfop") as string) || undefined;
  const icmsRateStr = formData.get("icmsRate") as string | null;
  const ipiRateStr = formData.get("ipiRate") as string | null;
  const pisRateStr = formData.get("pisRate") as string | null;
  const cofinsRateStr = formData.get("cofinsRate") as string | null;
  const origin = (formData.get("origin") as string) || undefined;
  const lotControl = formData.get("lotControl") === "true";
  const serialControl = formData.get("serialControl") === "true";
  const expiryControl = formData.get("expiryControl") === "true";
  const shelfLifeStr = formData.get("shelfLife") as string | null;
  const defaultSectorId = (formData.get("defaultSectorId") as string) || undefined;
  const location = (formData.get("location") as string) || undefined;
  const images = (formData.get("images") as string) || undefined;

  if (!name) {
    throw new Error("Nome é obrigatório");
  }
  if (!sku) {
    throw new Error("SKU é obrigatório");
  }

  const existing = await prisma.product.findUnique({
    where: { companyId_sku: { companyId, sku } },
  });
  if (existing) {
    throw new Error("Já existe um produto com este SKU");
  }

  if (barcode) {
    const existingBarcode = await prisma.product.findUnique({
      where: { companyId_barcode: { companyId, barcode } },
    });
    if (existingBarcode) {
      throw new Error("Já existe um produto com este código de barras");
    }
  }

  const product = await prisma.product.create({
    data: {
      companyId,
      name,
      sku,
      description,
      type,
      unit,
      minimumStock: minimumStockStr ? parseFloat(minimumStockStr) : 0,
      maximumStock: maximumStockStr ? parseFloat(maximumStockStr) : undefined,
      reorderPoint: reorderPointStr ? parseFloat(reorderPointStr) : 0,
      costPrice: costPriceStr ? parseFloat(costPriceStr) : undefined,
      salePrice: salePriceStr ? parseFloat(salePriceStr) : undefined,
      barcode,
      group,
      family,
      brand,
      secondaryUnit,
      conversionFactor: conversionFactorStr ? parseFloat(conversionFactorStr) : undefined,
      weight: weightStr ? parseFloat(weightStr) : undefined,
      width: widthStr ? parseFloat(widthStr) : undefined,
      height: heightStr ? parseFloat(heightStr) : undefined,
      depth: depthStr ? parseFloat(depthStr) : undefined,
      ncm,
      cest,
      cfop,
      icmsRate: icmsRateStr ? parseFloat(icmsRateStr) : undefined,
      ipiRate: ipiRateStr ? parseFloat(ipiRateStr) : undefined,
      pisRate: pisRateStr ? parseFloat(pisRateStr) : undefined,
      cofinsRate: cofinsRateStr ? parseFloat(cofinsRateStr) : undefined,
      origin,
      lotControl,
      serialControl,
      expiryControl,
      shelfLife: shelfLifeStr ? parseInt(shelfLifeStr, 10) : undefined,
      defaultSectorId,
      location,
      images,
    },
  });

  revalidatePath("/inventory");
  return serialize(product);
}

export async function updateProduct(id: string, formData: FormData) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.product.findFirst({
    where: { id, companyId },
  });
  if (!existing) {
    throw new Error("Produto não encontrado");
  }

  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string;
  const description = (formData.get("description") as string) || null;
  const type = (formData.get("type") as ProductType) || existing.type;
  const unit = (formData.get("unit") as string) || existing.unit;
  const minimumStockStr = formData.get("minimumStock") as string | null;
  const maximumStockStr = formData.get("maximumStock") as string | null;
  const reorderPointStr = formData.get("reorderPoint") as string | null;
  const costPriceStr = formData.get("costPrice") as string | null;
  const salePriceStr = formData.get("salePrice") as string | null;
  const barcode = (formData.get("barcode") as string) || null;
  const group = (formData.get("group") as string) || null;
  const family = (formData.get("family") as string) || null;
  const brand = (formData.get("brand") as string) || null;
  const secondaryUnit = (formData.get("secondaryUnit") as string) || null;
  const conversionFactorStr = formData.get("conversionFactor") as string | null;
  const weightStr = formData.get("weight") as string | null;
  const widthStr = formData.get("width") as string | null;
  const heightStr = formData.get("height") as string | null;
  const depthStr = formData.get("depth") as string | null;
  const ncm = (formData.get("ncm") as string) || null;
  const cest = (formData.get("cest") as string) || null;
  const cfop = (formData.get("cfop") as string) || null;
  const icmsRateStr = formData.get("icmsRate") as string | null;
  const ipiRateStr = formData.get("ipiRate") as string | null;
  const pisRateStr = formData.get("pisRate") as string | null;
  const cofinsRateStr = formData.get("cofinsRate") as string | null;
  const origin = (formData.get("origin") as string) || null;
  const lotControl = formData.has("lotControl") ? formData.get("lotControl") === "true" : existing.lotControl;
  const serialControl = formData.has("serialControl") ? formData.get("serialControl") === "true" : existing.serialControl;
  const expiryControl = formData.has("expiryControl") ? formData.get("expiryControl") === "true" : existing.expiryControl;
  const shelfLifeStr = formData.get("shelfLife") as string | null;
  const defaultSectorId = (formData.get("defaultSectorId") as string) || null;
  const location = (formData.get("location") as string) || null;
  const images = (formData.get("images") as string) || null;

  if (!name) {
    throw new Error("Nome é obrigatório");
  }
  if (!sku) {
    throw new Error("SKU é obrigatório");
  }

  // Check SKU uniqueness if it changed
  if (sku !== existing.sku) {
    const duplicate = await prisma.product.findUnique({
      where: { companyId_sku: { companyId, sku } },
    });
    if (duplicate) {
      throw new Error("Já existe um produto com este SKU");
    }
  }

  // Check barcode uniqueness if it changed
  if (barcode && barcode !== existing.barcode) {
    const duplicateBarcode = await prisma.product.findUnique({
      where: { companyId_barcode: { companyId, barcode } },
    });
    if (duplicateBarcode) {
      throw new Error("Já existe um produto com este código de barras");
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name,
      sku,
      description,
      type,
      unit,
      minimumStock: minimumStockStr ? parseFloat(minimumStockStr) : existing.minimumStock,
      maximumStock: maximumStockStr ? parseFloat(maximumStockStr) : null,
      reorderPoint: reorderPointStr ? parseFloat(reorderPointStr) : existing.reorderPoint,
      costPrice: costPriceStr ? parseFloat(costPriceStr) : null,
      salePrice: salePriceStr ? parseFloat(salePriceStr) : null,
      barcode,
      group,
      family,
      brand,
      secondaryUnit,
      conversionFactor: conversionFactorStr ? parseFloat(conversionFactorStr) : null,
      weight: weightStr ? parseFloat(weightStr) : null,
      width: widthStr ? parseFloat(widthStr) : null,
      height: heightStr ? parseFloat(heightStr) : null,
      depth: depthStr ? parseFloat(depthStr) : null,
      ncm,
      cest,
      cfop,
      icmsRate: icmsRateStr ? parseFloat(icmsRateStr) : null,
      ipiRate: ipiRateStr ? parseFloat(ipiRateStr) : null,
      pisRate: pisRateStr ? parseFloat(pisRateStr) : null,
      cofinsRate: cofinsRateStr ? parseFloat(cofinsRateStr) : null,
      origin,
      lotControl,
      serialControl,
      expiryControl,
      shelfLife: shelfLifeStr ? parseInt(shelfLifeStr, 10) : null,
      defaultSectorId,
      location,
      images,
    },
  });

  revalidatePath("/inventory");
  return serialize(product);
}

export async function deleteProduct(id: string) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.product.findFirst({
    where: { id, companyId },
  });
  if (!existing) {
    throw new Error("Produto não encontrado");
  }

  if (Number(existing.currentStock) !== 0) {
    throw new Error("Não é possível excluir um produto com estoque. Ajuste o estoque para zero primeiro");
  }

  await prisma.product.delete({ where: { id } });

  revalidatePath("/inventory");
}

// ---------------------------------------------------------------------------
// Stock Movements
// ---------------------------------------------------------------------------

export async function getMovements(options?: string | { type?: string; productId?: string }) {
  const companyId = await getActiveCompanyId();

  // Support both old signature (productId string) and new object format
  const productId = typeof options === "string" ? options : options?.productId;
  const type = typeof options === "object" ? options?.type : undefined;

  const movements = await prisma.stockMovement.findMany({
    where: {
      companyId,
      ...(productId ? { productId } : {}),
      ...(type ? { type: type as MovementType } : {}),
    },
    include: {
      product: true,
      user: true,
      lot: true,
      fromSector: true,
      toSector: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return serialize(movements);
}

export async function createMovement(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const user = await getSessionUser();

  const productId = formData.get("productId") as string;
  const type = formData.get("type") as MovementType;
  const quantityStr = formData.get("quantity") as string;
  const notes = (formData.get("notes") as string) || undefined;

  if (!productId) {
    throw new Error("Produto é obrigatório");
  }
  if (!type) {
    throw new Error("Tipo de movimentação é obrigatório");
  }
  if (!quantityStr) {
    throw new Error("Quantidade é obrigatória");
  }

  const quantity = parseFloat(quantityStr);
  if (isNaN(quantity) || quantity < 0) {
    throw new Error("Quantidade inválida");
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
  });
  if (!product) {
    throw new Error("Produto não encontrado");
  }

  const previousStock = Number(product.currentStock);
  let newStock: number;

  switch (type) {
    case "IN":
    case "PRODUCTION_OUTPUT":
    case "RETURN":
      newStock = previousStock + quantity;
      break;
    case "OUT":
    case "PRODUCTION_CONSUME":
    case "REQUISITION":
      if (previousStock < quantity) {
        throw new Error(
          `Estoque insuficiente. Estoque atual: ${previousStock}, quantidade solicitada: ${quantity}`
        );
      }
      newStock = previousStock - quantity;
      break;
    case "ADJUSTMENT":
      newStock = quantity;
      break;
    default:
      throw new Error("Tipo de movimentação inválido");
  }

  const result = await prisma.$transaction(async (tx) => {
    const movement = await tx.stockMovement.create({
      data: {
        productId,
        companyId,
        type,
        quantity,
        previousStock,
        newStock,
        notes,
        userId: user.id,
      },
      include: {
        product: true,
        user: true,
      },
    });

    await tx.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
    });

    // Check if stock is below reorder point and create alert if needed
    const reorderPoint = Number(product.reorderPoint);
    if (newStock <= reorderPoint && newStock > 0) {
      // Resolve any existing unresolved alerts for this product before creating new one
      await tx.materialAlert.updateMany({
        where: { productId, companyId, isResolved: false },
        data: { isResolved: true, resolvedAt: new Date() },
      });

      await tx.materialAlert.create({
        data: {
          companyId,
          productId,
          type: "LOW_STOCK",
          message: `Estoque de "${product.name}" está abaixo do ponto de reposição (${newStock} ${product.unit}, mínimo: ${reorderPoint})`,
        },
      });
    } else if (newStock === 0) {
      await tx.materialAlert.updateMany({
        where: { productId, companyId, isResolved: false },
        data: { isResolved: true, resolvedAt: new Date() },
      });

      await tx.materialAlert.create({
        data: {
          companyId,
          productId,
          type: "OUT_OF_STOCK",
          message: `Produto "${product.name}" está sem estoque`,
        },
      });
    } else if (newStock > reorderPoint) {
      // Stock is healthy — resolve any open alerts
      await tx.materialAlert.updateMany({
        where: { productId, companyId, isResolved: false },
        data: { isResolved: true, resolvedAt: new Date() },
      });
    }

    return movement;
  });

  revalidatePath("/inventory");
  return serialize(result);
}

// ---------------------------------------------------------------------------
// Purchase Orders
// ---------------------------------------------------------------------------

export async function getPurchaseOrders() {
  const companyId = await getActiveCompanyId();

  const orders = await prisma.purchaseOrder.findMany({
    where: { companyId },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return serialize(orders);
}

export async function getPurchaseOrder(id: string) {
  const companyId = await getActiveCompanyId();

  const order = await prisma.purchaseOrder.findFirst({
    where: { id, companyId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
        },
      },
    },
  });

  if (!order) {
    throw new Error("Pedido de compra não encontrado");
  }

  return serialize(order);
}

interface PurchaseOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export async function createPurchaseOrder(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const supplierName = formData.get("supplierName") as string;
  const expectedDeliveryStr = formData.get("expectedDelivery") as string | null;
  const itemsJson = formData.get("items") as string;

  if (!supplierName) {
    throw new Error("Nome do fornecedor é obrigatório");
  }
  if (!itemsJson) {
    throw new Error("Itens são obrigatórios");
  }

  let items: PurchaseOrderItemInput[];
  try {
    items = JSON.parse(itemsJson);
  } catch {
    throw new Error("Formato de itens inválido");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Pelo menos um item é obrigatório");
  }

  // Validate all products belong to the company
  const productIds = items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, companyId },
  });
  if (products.length !== productIds.length) {
    throw new Error("Um ou mais produtos não foram encontrados");
  }

  const totalValue = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const order = await prisma.purchaseOrder.create({
    data: {
      companyId,
      supplierName,
      status: "DRAFT",
      totalValue,
      expectedDelivery: expectedDeliveryStr ? new Date(expectedDeliveryStr) : undefined,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
        },
      },
    },
  });

  revalidatePath("/inventory");
  return serialize(order);
}

export async function updatePurchaseOrderStatus(
  id: string,
  status: PurchaseOrderStatus
) {
  const companyId = await getActiveCompanyId();
  const user = await getSessionUser();

  const order = await prisma.purchaseOrder.findFirst({
    where: { id, companyId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  if (!order) {
    throw new Error("Pedido de compra não encontrado");
  }

  if (order.status === "CANCELLED") {
    throw new Error("Não é possível alterar um pedido cancelado");
  }
  if (order.status === "RECEIVED") {
    throw new Error("Pedido já foi recebido");
  }

  if (status === "RECEIVED") {
    // Receive all items: create IN movements and update product stocks
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const product = item.product;
        const previousStock = Number(product.currentStock);
        const quantity = Number(item.quantity);
        const newStock = previousStock + quantity;

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            companyId,
            type: "IN",
            quantity,
            previousStock,
            newStock,
            referenceType: "PURCHASE_ORDER",
            referenceId: order.id,
            notes: `Recebimento do pedido de compra #${order.id.slice(-6).toUpperCase()}`,
            userId: user.id,
          },
        });

        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: newStock },
        });

        // Update received quantity on the order item
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { receivedQuantity: quantity },
        });

        // Resolve low stock alerts if stock is now above reorder point
        const reorderPoint = Number(product.reorderPoint);
        if (newStock > reorderPoint) {
          await tx.materialAlert.updateMany({
            where: { productId: product.id, companyId, isResolved: false },
            data: { isResolved: true, resolvedAt: new Date() },
          });
        }
      }

      await tx.purchaseOrder.update({
        where: { id },
        data: { status: "RECEIVED" },
      });
    });
  } else {
    await prisma.purchaseOrder.update({
      where: { id },
      data: { status },
    });
  }

  revalidatePath("/inventory");
}

export async function deletePurchaseOrder(id: string) {
  const companyId = await getActiveCompanyId();

  const order = await prisma.purchaseOrder.findFirst({
    where: { id, companyId },
  });

  if (!order) {
    throw new Error("Pedido de compra não encontrado");
  }

  if (order.status !== "DRAFT") {
    throw new Error("Apenas pedidos em rascunho podem ser excluídos");
  }

  await prisma.purchaseOrder.delete({ where: { id } });

  revalidatePath("/inventory");
}

// ---------------------------------------------------------------------------
// Warehouse Sectors
// ---------------------------------------------------------------------------

export async function getWarehouseSectors() {
  const companyId = await getActiveCompanyId();

  const sectors = await prisma.warehouseSector.findMany({
    where: { companyId },
    include: {
      _count: { select: { sectorStocks: true } },
    },
    orderBy: { name: "asc" },
  });

  return serialize(sectors);
}

export async function createWarehouseSector(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const name = formData.get("name") as string;
  const code = (formData.get("code") as string) || undefined;
  const description = (formData.get("description") as string) || undefined;

  if (!name) {
    throw new Error("Nome do setor é obrigatório");
  }

  if (code) {
    const existing = await prisma.warehouseSector.findUnique({
      where: { companyId_code: { companyId, code } },
    });
    if (existing) {
      throw new Error("Já existe um setor com este código");
    }
  }

  const sector = await prisma.warehouseSector.create({
    data: {
      companyId,
      name,
      code,
      description,
    },
  });

  revalidatePath("/inventory");
  return serialize(sector);
}

export async function updateWarehouseSector(id: string, formData: FormData) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.warehouseSector.findFirst({
    where: { id, companyId },
  });
  if (!existing) {
    throw new Error("Setor não encontrado");
  }

  const name = formData.get("name") as string;
  const code = (formData.get("code") as string) || null;
  const description = (formData.get("description") as string) || null;

  if (!name) {
    throw new Error("Nome do setor é obrigatório");
  }

  if (code && code !== existing.code) {
    const duplicate = await prisma.warehouseSector.findUnique({
      where: { companyId_code: { companyId, code } },
    });
    if (duplicate) {
      throw new Error("Já existe um setor com este código");
    }
  }

  const sector = await prisma.warehouseSector.update({
    where: { id },
    data: { name, code, description },
  });

  revalidatePath("/inventory");
  return serialize(sector);
}

export async function deleteWarehouseSector(id: string) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.warehouseSector.findFirst({
    where: { id, companyId },
    include: { _count: { select: { sectorStocks: true } } },
  });
  if (!existing) {
    throw new Error("Setor não encontrado");
  }

  // Check if sector has stock
  const stockCount = await prisma.sectorStock.count({
    where: { sectorId: id, quantity: { gt: 0 } },
  });
  if (stockCount > 0) {
    throw new Error("Não é possível excluir um setor que possui estoque. Transfira o estoque antes de excluir");
  }

  await prisma.warehouseSector.delete({ where: { id } });

  revalidatePath("/inventory");
}

export async function getSectorStocks(sectorId: string) {
  const companyId = await getActiveCompanyId();

  // Validate sector belongs to the company
  const sector = await prisma.warehouseSector.findFirst({
    where: { id: sectorId, companyId },
  });
  if (!sector) {
    throw new Error("Setor não encontrado");
  }

  const stocks = await prisma.sectorStock.findMany({
    where: { sectorId },
    include: {
      product: {
        select: { id: true, name: true, sku: true, unit: true, currentStock: true },
      },
    },
    orderBy: { product: { name: "asc" } },
  });

  return serialize(stocks);
}

// ---------------------------------------------------------------------------
// Stock Transfers (between sectors)
// ---------------------------------------------------------------------------

export async function transferStock(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const user = await getSessionUser();

  const productId = formData.get("productId") as string;
  const fromSectorId = formData.get("fromSectorId") as string;
  const toSectorId = formData.get("toSectorId") as string;
  const quantityStr = formData.get("quantity") as string;
  const notes = (formData.get("notes") as string) || undefined;

  if (!productId) {
    throw new Error("Produto é obrigatório");
  }
  if (!fromSectorId) {
    throw new Error("Setor de origem é obrigatório");
  }
  if (!toSectorId) {
    throw new Error("Setor de destino é obrigatório");
  }
  if (fromSectorId === toSectorId) {
    throw new Error("Setor de origem e destino devem ser diferentes");
  }
  if (!quantityStr) {
    throw new Error("Quantidade é obrigatória");
  }

  const quantity = parseFloat(quantityStr);
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error("Quantidade inválida");
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
  });
  if (!product) {
    throw new Error("Produto não encontrado");
  }

  // Validate sectors
  const [fromSector, toSector] = await Promise.all([
    prisma.warehouseSector.findFirst({ where: { id: fromSectorId, companyId } }),
    prisma.warehouseSector.findFirst({ where: { id: toSectorId, companyId } }),
  ]);
  if (!fromSector) {
    throw new Error("Setor de origem não encontrado");
  }
  if (!toSector) {
    throw new Error("Setor de destino não encontrado");
  }

  // Check source sector stock
  const fromStock = await prisma.sectorStock.findUnique({
    where: { productId_sectorId: { productId, sectorId: fromSectorId } },
  });
  const fromQuantity = fromStock ? Number(fromStock.quantity) : 0;
  if (fromQuantity < quantity) {
    throw new Error(
      `Estoque insuficiente no setor de origem. Disponível: ${fromQuantity}, solicitado: ${quantity}`
    );
  }

  const previousStock = Number(product.currentStock);

  const result = await prisma.$transaction(async (tx) => {
    // Create TRANSFER movement
    const movement = await tx.stockMovement.create({
      data: {
        productId,
        companyId,
        type: "TRANSFER",
        quantity,
        previousStock,
        newStock: previousStock, // Total stock doesn't change on transfers
        fromSectorId,
        toSectorId,
        notes: notes || `Transferência de ${fromSector.name} para ${toSector.name}`,
        userId: user.id,
      },
      include: {
        product: true,
        user: true,
        fromSector: true,
        toSector: true,
      },
    });

    // Update source sector stock
    await tx.sectorStock.upsert({
      where: { productId_sectorId: { productId, sectorId: fromSectorId } },
      update: { quantity: { decrement: quantity } },
      create: { productId, sectorId: fromSectorId, quantity: 0 },
    });

    // Update destination sector stock
    await tx.sectorStock.upsert({
      where: { productId_sectorId: { productId, sectorId: toSectorId } },
      update: { quantity: { increment: quantity } },
      create: { productId, sectorId: toSectorId, quantity },
    });

    return movement;
  });

  revalidatePath("/inventory");
  return serialize(result);
}

// ---------------------------------------------------------------------------
// Product Lots
// ---------------------------------------------------------------------------

export async function getProductLots(productId?: string) {
  const companyId = await getActiveCompanyId();

  const lots = await prisma.productLot.findMany({
    where: {
      companyId,
      ...(productId ? { productId } : {}),
    },
    include: {
      product: { select: { id: true, name: true, sku: true, unit: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return serialize(lots);
}

export async function createProductLot(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const productId = formData.get("productId") as string;
  const lotNumber = formData.get("lotNumber") as string;
  const serialNumber = (formData.get("serialNumber") as string) || undefined;
  const quantityStr = formData.get("quantity") as string | null;
  const manufacturingDateStr = formData.get("manufacturingDate") as string | null;
  const expiryDateStr = formData.get("expiryDate") as string | null;
  const supplierName = (formData.get("supplierName") as string) || undefined;
  const notes = (formData.get("notes") as string) || undefined;

  if (!productId) {
    throw new Error("Produto é obrigatório");
  }
  if (!lotNumber) {
    throw new Error("Número do lote é obrigatório");
  }

  // Validate product
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
  });
  if (!product) {
    throw new Error("Produto não encontrado");
  }

  // Check uniqueness
  const existing = await prisma.productLot.findUnique({
    where: { companyId_productId_lotNumber: { companyId, productId, lotNumber } },
  });
  if (existing) {
    throw new Error("Já existe um lote com este número para este produto");
  }

  const lot = await prisma.productLot.create({
    data: {
      companyId,
      productId,
      lotNumber,
      serialNumber,
      quantity: quantityStr ? parseFloat(quantityStr) : 0,
      manufacturingDate: manufacturingDateStr ? new Date(manufacturingDateStr) : undefined,
      expiryDate: expiryDateStr ? new Date(expiryDateStr) : undefined,
      supplierName,
      notes,
    },
    include: {
      product: { select: { id: true, name: true, sku: true, unit: true } },
    },
  });

  revalidatePath("/inventory");
  return serialize(lot);
}

export async function updateProductLot(id: string, formData: FormData) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.productLot.findFirst({
    where: { id, companyId },
  });
  if (!existing) {
    throw new Error("Lote não encontrado");
  }

  const lotNumber = (formData.get("lotNumber") as string) || existing.lotNumber;
  const serialNumber = (formData.get("serialNumber") as string) || null;
  const quantityStr = formData.get("quantity") as string | null;
  const manufacturingDateStr = formData.get("manufacturingDate") as string | null;
  const expiryDateStr = formData.get("expiryDate") as string | null;
  const supplierName = (formData.get("supplierName") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const isActive = formData.has("isActive") ? formData.get("isActive") === "true" : existing.isActive;

  // Check lot number uniqueness if changed
  if (lotNumber !== existing.lotNumber) {
    const duplicate = await prisma.productLot.findUnique({
      where: {
        companyId_productId_lotNumber: {
          companyId,
          productId: existing.productId,
          lotNumber,
        },
      },
    });
    if (duplicate) {
      throw new Error("Já existe um lote com este número para este produto");
    }
  }

  const lot = await prisma.productLot.update({
    where: { id },
    data: {
      lotNumber,
      serialNumber,
      quantity: quantityStr ? parseFloat(quantityStr) : existing.quantity,
      manufacturingDate: manufacturingDateStr ? new Date(manufacturingDateStr) : existing.manufacturingDate,
      expiryDate: expiryDateStr ? new Date(expiryDateStr) : existing.expiryDate,
      supplierName,
      notes,
      isActive,
    },
    include: {
      product: { select: { id: true, name: true, sku: true, unit: true } },
    },
  });

  revalidatePath("/inventory");
  return serialize(lot);
}

export async function getExpiringLots(daysAhead: number = 30) {
  const companyId = await getActiveCompanyId();

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const lots = await prisma.productLot.findMany({
    where: {
      companyId,
      isActive: true,
      quantity: { gt: 0 },
      expiryDate: {
        lte: futureDate,
      },
    },
    include: {
      product: { select: { id: true, name: true, sku: true, unit: true } },
    },
    orderBy: { expiryDate: "asc" },
  });

  return serialize(lots);
}

// ---------------------------------------------------------------------------
// Physical Inventory (Inventory Counts)
// ---------------------------------------------------------------------------

export async function getInventoryCounts() {
  const companyId = await getActiveCompanyId();

  const counts = await prisma.inventoryCount.findMany({
    where: { companyId },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return serialize(counts);
}

export async function createInventoryCount(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || undefined;

  if (!title) {
    throw new Error("Título é obrigatório");
  }

  // Get all active products with current stock
  const products = await prisma.product.findMany({
    where: { companyId, isActive: true },
    select: { id: true, currentStock: true },
  });

  const count = await prisma.inventoryCount.create({
    data: {
      companyId,
      title,
      description,
      status: "DRAFT",
      items: {
        create: products.map((p) => ({
          productId: p.id,
          systemQuantity: p.currentStock,
        })),
      },
    },
    include: {
      _count: { select: { items: true } },
    },
  });

  revalidatePath("/inventory");
  return serialize(count);
}

export async function getInventoryCount(id: string) {
  const companyId = await getActiveCompanyId();

  const count = await prisma.inventoryCount.findFirst({
    where: { id, companyId },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, sku: true, unit: true, currentStock: true },
          },
        },
        orderBy: { product: { name: "asc" } },
      },
    },
  });

  if (!count) {
    throw new Error("Contagem de inventário não encontrada");
  }

  return serialize(count);
}

export async function updateCountItem(itemId: string, countedQuantity: number) {
  const item = await prisma.inventoryCountItem.findFirst({
    where: { id: itemId },
    include: {
      inventoryCount: true,
    },
  });

  if (!item) {
    throw new Error("Item de contagem não encontrado");
  }

  if (item.inventoryCount.status === "COMPLETED") {
    throw new Error("Esta contagem já foi finalizada");
  }
  if (item.inventoryCount.status === "CANCELLED") {
    throw new Error("Esta contagem foi cancelada");
  }

  const systemQty = Number(item.systemQuantity);
  const difference = countedQuantity - systemQty;

  const updated = await prisma.inventoryCountItem.update({
    where: { id: itemId },
    data: {
      countedQuantity,
      difference,
      isCounted: true,
    },
  });

  // Update count status to IN_PROGRESS if still DRAFT
  if (item.inventoryCount.status === "DRAFT") {
    await prisma.inventoryCount.update({
      where: { id: item.inventoryCountId },
      data: { status: "IN_PROGRESS" },
    });
  }

  revalidatePath("/inventory");
  return serialize(updated);
}

export async function completeInventoryCount(id: string) {
  const companyId = await getActiveCompanyId();
  const user = await getSessionUser();

  const count = await prisma.inventoryCount.findFirst({
    where: { id, companyId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  if (!count) {
    throw new Error("Contagem de inventário não encontrada");
  }

  if (count.status === "COMPLETED") {
    throw new Error("Esta contagem já foi finalizada");
  }
  if (count.status === "CANCELLED") {
    throw new Error("Esta contagem foi cancelada");
  }

  // Check that all items have been counted
  const uncountedItems = count.items.filter((item) => !item.isCounted);
  if (uncountedItems.length > 0) {
    throw new Error(
      `Existem ${uncountedItems.length} itens ainda não contados. Conte todos os itens antes de finalizar`
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const item of count.items) {
      const countedQty = Number(item.countedQuantity);
      const systemQty = Number(item.systemQuantity);
      const diff = countedQty - systemQty;

      if (diff !== 0) {
        const product = item.product;
        const previousStock = Number(product.currentStock);
        const newStock = countedQty;

        // Create ADJUSTMENT movement
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            companyId,
            type: "ADJUSTMENT",
            quantity: countedQty,
            previousStock,
            newStock,
            referenceType: "INVENTORY_COUNT",
            referenceId: count.id,
            notes: `Ajuste por contagem de inventário "${count.title}" (diferença: ${diff > 0 ? "+" : ""}${diff})`,
            userId: user.id,
          },
        });

        // Update product stock
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: newStock },
        });

        // Update material alerts
        const reorderPoint = Number(product.reorderPoint);
        if (newStock <= reorderPoint && newStock > 0) {
          await tx.materialAlert.updateMany({
            where: { productId: product.id, companyId, isResolved: false },
            data: { isResolved: true, resolvedAt: new Date() },
          });
          await tx.materialAlert.create({
            data: {
              companyId,
              productId: product.id,
              type: "LOW_STOCK",
              message: `Estoque de "${product.name}" ajustado para ${newStock} ${product.unit} (abaixo do ponto de reposição: ${reorderPoint})`,
            },
          });
        } else if (newStock === 0) {
          await tx.materialAlert.updateMany({
            where: { productId: product.id, companyId, isResolved: false },
            data: { isResolved: true, resolvedAt: new Date() },
          });
          await tx.materialAlert.create({
            data: {
              companyId,
              productId: product.id,
              type: "OUT_OF_STOCK",
              message: `Produto "${product.name}" ficou sem estoque após contagem de inventário`,
            },
          });
        } else if (newStock > reorderPoint) {
          await tx.materialAlert.updateMany({
            where: { productId: product.id, companyId, isResolved: false },
            data: { isResolved: true, resolvedAt: new Date() },
          });
        }
      }
    }

    await tx.inventoryCount.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  });

  revalidatePath("/inventory");
}

export async function cancelInventoryCount(id: string) {
  const companyId = await getActiveCompanyId();

  const count = await prisma.inventoryCount.findFirst({
    where: { id, companyId },
  });

  if (!count) {
    throw new Error("Contagem de inventário não encontrada");
  }

  if (count.status === "COMPLETED") {
    throw new Error("Não é possível cancelar uma contagem já finalizada");
  }
  if (count.status === "CANCELLED") {
    throw new Error("Esta contagem já foi cancelada");
  }

  await prisma.inventoryCount.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/inventory");
}

// ---------------------------------------------------------------------------
// Material Requisitions
// ---------------------------------------------------------------------------

async function generateRequisitionNumber(companyId: string): Promise<string> {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const prefix = `RM-${datePart}-`;

  const lastRequisition = await prisma.materialRequisition.findFirst({
    where: {
      companyId,
      requisitionNumber: { startsWith: prefix },
    },
    orderBy: { requisitionNumber: "desc" },
  });

  let nextNumber = 1;
  if (lastRequisition) {
    const lastNumber = parseInt(lastRequisition.requisitionNumber.split("-").pop() || "0", 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}

export async function getMaterialRequisitions() {
  const companyId = await getActiveCompanyId();

  const requisitions = await prisma.materialRequisition.findMany({
    where: { companyId },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return serialize(requisitions);
}

interface RequisitionItemInput {
  productId: string;
  requestedQuantity: number;
}

export async function createMaterialRequisition(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const user = await getSessionUser();

  const description = (formData.get("description") as string) || undefined;
  const costCenterId = (formData.get("costCenterId") as string) || undefined;
  const productionOrderId = (formData.get("productionOrderId") as string) || undefined;
  const itemsJson = formData.get("items") as string;

  if (!itemsJson) {
    throw new Error("Itens são obrigatórios");
  }

  let items: RequisitionItemInput[];
  try {
    items = JSON.parse(itemsJson);
  } catch {
    throw new Error("Formato de itens inválido");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Pelo menos um item é obrigatório");
  }

  // Validate products
  const productIds = items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, companyId },
  });
  if (products.length !== productIds.length) {
    throw new Error("Um ou mais produtos não foram encontrados");
  }

  const requisitionNumber = await generateRequisitionNumber(companyId);

  const requisition = await prisma.materialRequisition.create({
    data: {
      companyId,
      requisitionNumber,
      requestedById: user.id,
      description,
      costCenterId,
      productionOrderId,
      status: "PENDING",
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          requestedQuantity: item.requestedQuantity,
        })),
      },
    },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
        },
      },
    },
  });

  revalidatePath("/inventory");
  return serialize(requisition);
}

export async function getMaterialRequisition(id: string) {
  const companyId = await getActiveCompanyId();

  const requisition = await prisma.materialRequisition.findFirst({
    where: { id, companyId },
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true, currentStock: true } },
        },
      },
    },
  });

  if (!requisition) {
    throw new Error("Requisição de material não encontrada");
  }

  return serialize(requisition);
}

export async function approveMaterialRequisition(id: string) {
  const companyId = await getActiveCompanyId();

  const requisition = await prisma.materialRequisition.findFirst({
    where: { id, companyId },
    include: { items: true },
  });

  if (!requisition) {
    throw new Error("Requisição de material não encontrada");
  }

  if (requisition.status !== "PENDING") {
    throw new Error("Apenas requisições pendentes podem ser aprovadas");
  }

  await prisma.$transaction(async (tx) => {
    // Set approved quantity equal to requested quantity for all items
    for (const item of requisition.items) {
      await tx.materialRequisitionItem.update({
        where: { id: item.id },
        data: { approvedQuantity: item.requestedQuantity },
      });
    }

    await tx.materialRequisition.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });
  });

  revalidatePath("/inventory");
}

export async function fulfillMaterialRequisitionItem(itemId: string, quantity: number) {
  const companyId = await getActiveCompanyId();
  const user = await getSessionUser();

  if (quantity <= 0) {
    throw new Error("Quantidade deve ser maior que zero");
  }

  const item = await prisma.materialRequisitionItem.findFirst({
    where: { id: itemId },
    include: {
      requisition: true,
      product: true,
    },
  });

  if (!item) {
    throw new Error("Item de requisição não encontrado");
  }

  if (item.requisition.companyId !== companyId) {
    throw new Error("Item de requisição não encontrado");
  }

  if (item.requisition.status !== "APPROVED" && item.requisition.status !== "PARTIALLY_FULFILLED") {
    throw new Error("A requisição deve estar aprovada para atendimento");
  }

  const approvedQty = Number(item.approvedQuantity || 0);
  const deliveredQty = Number(item.deliveredQuantity);
  const remaining = approvedQty - deliveredQty;

  if (quantity > remaining) {
    throw new Error(
      `Quantidade excede o saldo aprovado. Restante: ${remaining}`
    );
  }

  // Check product stock
  const product = item.product;
  const currentStock = Number(product.currentStock);
  if (currentStock < quantity) {
    throw new Error(
      `Estoque insuficiente de "${product.name}". Disponível: ${currentStock}, solicitado: ${quantity}`
    );
  }

  const previousStock = currentStock;
  const newStock = currentStock - quantity;
  const newDelivered = deliveredQty + quantity;

  await prisma.$transaction(async (tx) => {
    // Create OUT movement
    await tx.stockMovement.create({
      data: {
        productId: product.id,
        companyId,
        type: "REQUISITION",
        quantity,
        previousStock,
        newStock,
        referenceType: "MATERIAL_REQUISITION",
        referenceId: item.requisition.id,
        notes: `Atendimento da requisição ${item.requisition.requisitionNumber}`,
        userId: user.id,
      },
    });

    // Update product stock
    await tx.product.update({
      where: { id: product.id },
      data: { currentStock: newStock },
    });

    // Update delivered quantity on requisition item
    await tx.materialRequisitionItem.update({
      where: { id: itemId },
      data: { deliveredQuantity: newDelivered },
    });

    // Check if all items are fully fulfilled
    const allItems = await tx.materialRequisitionItem.findMany({
      where: { requisitionId: item.requisition.id },
    });

    // Recalculate with the updated item
    const allFulfilled = allItems.every((i) => {
      const approved = Number(i.approvedQuantity || 0);
      const delivered = i.id === itemId ? newDelivered : Number(i.deliveredQuantity);
      return delivered >= approved;
    });

    const anyFulfilled = allItems.some((i) => {
      const delivered = i.id === itemId ? newDelivered : Number(i.deliveredQuantity);
      return delivered > 0;
    });

    let newStatus: RequisitionStatus;
    if (allFulfilled) {
      newStatus = "FULFILLED";
    } else if (anyFulfilled) {
      newStatus = "PARTIALLY_FULFILLED";
    } else {
      newStatus = "APPROVED";
    }

    await tx.materialRequisition.update({
      where: { id: item.requisition.id },
      data: {
        status: newStatus,
        ...(allFulfilled ? { fulfilledAt: new Date() } : {}),
      },
    });

    // Handle material alerts
    const reorderPoint = Number(product.reorderPoint);
    if (newStock <= reorderPoint && newStock > 0) {
      await tx.materialAlert.updateMany({
        where: { productId: product.id, companyId, isResolved: false },
        data: { isResolved: true, resolvedAt: new Date() },
      });
      await tx.materialAlert.create({
        data: {
          companyId,
          productId: product.id,
          type: "LOW_STOCK",
          message: `Estoque de "${product.name}" abaixo do ponto de reposição após atendimento de requisição (${newStock} ${product.unit})`,
        },
      });
    } else if (newStock === 0) {
      await tx.materialAlert.updateMany({
        where: { productId: product.id, companyId, isResolved: false },
        data: { isResolved: true, resolvedAt: new Date() },
      });
      await tx.materialAlert.create({
        data: {
          companyId,
          productId: product.id,
          type: "OUT_OF_STOCK",
          message: `Produto "${product.name}" ficou sem estoque após atendimento de requisição`,
        },
      });
    }
  });

  revalidatePath("/inventory");
}

export async function cancelMaterialRequisition(id: string) {
  const companyId = await getActiveCompanyId();

  const requisition = await prisma.materialRequisition.findFirst({
    where: { id, companyId },
  });

  if (!requisition) {
    throw new Error("Requisição de material não encontrada");
  }

  if (requisition.status === "FULFILLED") {
    throw new Error("Não é possível cancelar uma requisição já totalmente atendida");
  }
  if (requisition.status === "CANCELLED") {
    throw new Error("Esta requisição já foi cancelada");
  }

  await prisma.materialRequisition.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/inventory");
}

// ---------------------------------------------------------------------------
// Bill of Materials (BOM)
// ---------------------------------------------------------------------------

export async function getBOM(productId: string) {
  const companyId = await getActiveCompanyId();

  // Validate product
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
  });
  if (!product) {
    throw new Error("Produto não encontrado");
  }

  const bom = await prisma.billOfMaterial.findMany({
    where: { companyId, productId },
    include: {
      material: {
        select: {
          id: true,
          name: true,
          sku: true,
          unit: true,
          currentStock: true,
          costPrice: true,
        },
      },
    },
    orderBy: { order: "asc" },
  });

  return serialize(bom);
}

export async function addBOMItem(formData: FormData) {
  const companyId = await getActiveCompanyId();

  const productId = formData.get("productId") as string;
  const materialId = formData.get("materialId") as string;
  const quantityStr = formData.get("quantity") as string;
  const unit = (formData.get("unit") as string) || "unidade";
  const lossPercentStr = formData.get("lossPercent") as string | null;
  const isOptional = formData.get("isOptional") === "true";
  const isAlternative = formData.get("isAlternative") === "true";
  const alternativeGroup = (formData.get("alternativeGroup") as string) || undefined;
  const notes = (formData.get("notes") as string) || undefined;

  if (!productId) {
    throw new Error("Produto é obrigatório");
  }
  if (!materialId) {
    throw new Error("Material é obrigatório");
  }
  if (!quantityStr) {
    throw new Error("Quantidade é obrigatória");
  }
  if (productId === materialId) {
    throw new Error("O produto não pode ser material de si mesmo");
  }

  const quantity = parseFloat(quantityStr);
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error("Quantidade inválida");
  }

  // Validate both product and material belong to the company
  const [product, material] = await Promise.all([
    prisma.product.findFirst({ where: { id: productId, companyId } }),
    prisma.product.findFirst({ where: { id: materialId, companyId } }),
  ]);
  if (!product) {
    throw new Error("Produto não encontrado");
  }
  if (!material) {
    throw new Error("Material não encontrado");
  }

  // Check if already exists
  const existing = await prisma.billOfMaterial.findUnique({
    where: { companyId_productId_materialId: { companyId, productId, materialId } },
  });
  if (existing) {
    throw new Error("Este material já está na lista de materiais deste produto");
  }

  // Get the next order value
  const lastItem = await prisma.billOfMaterial.findFirst({
    where: { companyId, productId },
    orderBy: { order: "desc" },
  });
  const nextOrder = (lastItem?.order ?? -1) + 1;

  const bomItem = await prisma.billOfMaterial.create({
    data: {
      companyId,
      productId,
      materialId,
      quantity,
      unit,
      lossPercent: lossPercentStr ? parseFloat(lossPercentStr) : 0,
      isOptional,
      isAlternative,
      alternativeGroup,
      notes,
      order: nextOrder,
    },
    include: {
      material: {
        select: { id: true, name: true, sku: true, unit: true, currentStock: true, costPrice: true },
      },
    },
  });

  revalidatePath("/inventory");
  return serialize(bomItem);
}

export async function updateBOMItem(id: string, formData: FormData) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.billOfMaterial.findFirst({
    where: { id, companyId },
  });
  if (!existing) {
    throw new Error("Item da lista de materiais não encontrado");
  }

  const quantityStr = formData.get("quantity") as string | null;
  const unit = (formData.get("unit") as string) || existing.unit;
  const lossPercentStr = formData.get("lossPercent") as string | null;
  const isOptional = formData.has("isOptional") ? formData.get("isOptional") === "true" : existing.isOptional;
  const isAlternative = formData.has("isAlternative") ? formData.get("isAlternative") === "true" : existing.isAlternative;
  const alternativeGroup = (formData.get("alternativeGroup") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const orderStr = formData.get("order") as string | null;

  const bomItem = await prisma.billOfMaterial.update({
    where: { id },
    data: {
      quantity: quantityStr ? parseFloat(quantityStr) : existing.quantity,
      unit,
      lossPercent: lossPercentStr ? parseFloat(lossPercentStr) : existing.lossPercent,
      isOptional,
      isAlternative,
      alternativeGroup,
      notes,
      order: orderStr ? parseInt(orderStr, 10) : existing.order,
    },
    include: {
      material: {
        select: { id: true, name: true, sku: true, unit: true, currentStock: true, costPrice: true },
      },
    },
  });

  revalidatePath("/inventory");
  return serialize(bomItem);
}

export async function deleteBOMItem(id: string) {
  const companyId = await getActiveCompanyId();

  const existing = await prisma.billOfMaterial.findFirst({
    where: { id, companyId },
  });
  if (!existing) {
    throw new Error("Item da lista de materiais não encontrado");
  }

  await prisma.billOfMaterial.delete({ where: { id } });

  revalidatePath("/inventory");
}

export async function copyBOM(fromProductId: string, toProductId: string) {
  const companyId = await getActiveCompanyId();

  if (fromProductId === toProductId) {
    throw new Error("Produto de origem e destino devem ser diferentes");
  }

  // Validate both products
  const [fromProduct, toProduct] = await Promise.all([
    prisma.product.findFirst({ where: { id: fromProductId, companyId } }),
    prisma.product.findFirst({ where: { id: toProductId, companyId } }),
  ]);
  if (!fromProduct) {
    throw new Error("Produto de origem não encontrado");
  }
  if (!toProduct) {
    throw new Error("Produto de destino não encontrado");
  }

  // Get source BOM
  const sourceBOM = await prisma.billOfMaterial.findMany({
    where: { companyId, productId: fromProductId },
    orderBy: { order: "asc" },
  });

  if (sourceBOM.length === 0) {
    throw new Error("O produto de origem não possui lista de materiais");
  }

  // Delete existing BOM on target
  await prisma.billOfMaterial.deleteMany({
    where: { companyId, productId: toProductId },
  });

  // Copy items
  await prisma.billOfMaterial.createMany({
    data: sourceBOM.map((item) => ({
      companyId,
      productId: toProductId,
      materialId: item.materialId,
      quantity: item.quantity,
      unit: item.unit,
      lossPercent: item.lossPercent,
      isOptional: item.isOptional,
      isAlternative: item.isAlternative,
      alternativeGroup: item.alternativeGroup,
      notes: item.notes,
      order: item.order,
    })),
  });

  revalidatePath("/inventory");
}

// ---------------------------------------------------------------------------
// Projected Stock
// ---------------------------------------------------------------------------

export async function getProjectedStock(productId: string) {
  const companyId = await getActiveCompanyId();

  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
  });
  if (!product) {
    throw new Error("Produto não encontrado");
  }

  const currentStock = Number(product.currentStock);

  // Pending purchase orders (incoming)
  const pendingPurchaseItems = await prisma.purchaseOrderItem.findMany({
    where: {
      productId,
      purchaseOrder: {
        companyId,
        status: { in: ["DRAFT", "SENT", "PARTIAL"] },
      },
    },
  });
  const pendingPurchase = pendingPurchaseItems.reduce((sum, item) => {
    const ordered = Number(item.quantity);
    const received = Number(item.receivedQuantity);
    return sum + (ordered - received);
  }, 0);

  // Pending production material needs (outgoing)
  const pendingProductionMaterials = await prisma.productionOrderMaterial.findMany({
    where: {
      materialId: productId,
      productionOrder: {
        companyId,
        status: { in: ["PENDING", "QUEUED", "IN_PROGRESS"] },
      },
    },
  });
  const pendingProductionNeed = pendingProductionMaterials.reduce((sum, item) => {
    const required = Number(item.requiredQuantity);
    const consumed = Number(item.consumedQuantity);
    return sum + (required - consumed);
  }, 0);

  // Pending requisitions (outgoing)
  const pendingRequisitionItems = await prisma.materialRequisitionItem.findMany({
    where: {
      productId,
      requisition: {
        companyId,
        status: { in: ["APPROVED", "PARTIALLY_FULFILLED"] },
      },
    },
  });
  const pendingRequisition = pendingRequisitionItems.reduce((sum, item) => {
    const approved = Number(item.approvedQuantity || 0);
    const delivered = Number(item.deliveredQuantity);
    return sum + (approved - delivered);
  }, 0);

  // Pending production output (incoming - for finished products)
  const pendingProductionOutput = await prisma.productionOrderItem.findMany({
    where: {
      productId,
      productionOrder: {
        companyId,
        status: { in: ["PENDING", "QUEUED", "IN_PROGRESS"] },
      },
    },
  });
  const pendingOutput = pendingProductionOutput.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    const completed = Number(item.completedQuantity);
    return sum + (quantity - completed);
  }, 0);

  const projectedStock =
    currentStock +
    pendingPurchase +
    pendingOutput -
    pendingProductionNeed -
    pendingRequisition;

  return {
    productId,
    productName: product.name,
    currentStock,
    pendingPurchase,
    pendingProductionOutput: pendingOutput,
    pendingProductionNeed,
    pendingRequisition,
    projectedStock,
  };
}

export async function getAllProjectedStock() {
  const companyId = await getActiveCompanyId();

  const products = await prisma.product.findMany({
    where: { companyId },
    select: { id: true, name: true, sku: true, currentStock: true },
    orderBy: { name: "asc" },
  });

  const result = products.map((p) => ({
    productId: p.id,
    productName: p.name,
    sku: p.sku || "",
    currentStock: Number(p.currentStock),
    inboundPending: 0,
    outboundPending: 0,
    projectedStock: Number(p.currentStock),
  }));

  // Pending purchase order items (inbound)
  const purchaseItems = await prisma.purchaseOrderItem.findMany({
    where: {
      purchaseOrder: {
        companyId,
        status: { in: ["DRAFT", "SENT", "PARTIAL"] },
      },
    },
  });
  for (const item of purchaseItems) {
    const row = result.find((r) => r.productId === item.productId);
    if (row) {
      const pending = Number(item.quantity) - Number(item.receivedQuantity);
      row.inboundPending += pending;
      row.projectedStock += pending;
    }
  }

  // Pending production output (inbound for finished goods)
  const productionItems = await prisma.productionOrderItem.findMany({
    where: {
      productionOrder: {
        companyId,
        status: { in: ["PENDING", "QUEUED", "IN_PROGRESS"] },
      },
    },
  });
  for (const item of productionItems) {
    const row = result.find((r) => r.productId === item.productId);
    if (row) {
      const pending = Number(item.quantity) - Number(item.completedQuantity);
      row.inboundPending += pending;
      row.projectedStock += pending;
    }
  }

  // Pending production materials (outbound)
  const materialItems = await prisma.productionOrderMaterial.findMany({
    where: {
      productionOrder: {
        companyId,
        status: { in: ["PENDING", "QUEUED", "IN_PROGRESS"] },
      },
    },
  });
  for (const item of materialItems) {
    const row = result.find((r) => r.productId === item.materialId);
    if (row) {
      const pending = Number(item.requiredQuantity) - Number(item.consumedQuantity);
      row.outboundPending += pending;
      row.projectedStock -= pending;
    }
  }

  return serialize(result);
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export async function importProducts(data: string) {
  const companyId = await getActiveCompanyId();

  if (!data || !data.trim()) {
    throw new Error("Dados de importação estão vazios");
  }

  const lines = data.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("O arquivo deve conter pelo menos o cabeçalho e uma linha de dados");
  }

  // Detect separator (semicolon or comma)
  const separator = lines[0].includes(";") ? ";" : ",";

  // Parse header
  const header = lines[0].split(separator).map((h) => h.trim().toLowerCase());
  const requiredColumns = ["name", "sku"];
  for (const col of requiredColumns) {
    if (!header.includes(col)) {
      throw new Error(`Coluna obrigatória "${col}" não encontrada no cabeçalho`);
    }
  }

  const nameIdx = header.indexOf("name");
  const skuIdx = header.indexOf("sku");
  const typeIdx = header.indexOf("type");
  const unitIdx = header.indexOf("unit");
  const costPriceIdx = header.indexOf("costprice");
  const salePriceIdx = header.indexOf("saleprice");
  const minimumStockIdx = header.indexOf("minimumstock");

  const validTypes: ProductType[] = [
    "FINISHED_PRODUCT",
    "RAW_MATERIAL",
    "SEMI_FINISHED",
    "PACKAGING",
    "CONSUMABLE",
  ];

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handles both comma and semicolon separated values)
    const values = line.split(separator).map((v) => v.trim().replace(/^"(.*)"$/, "$1"));

    const name = values[nameIdx];
    const sku = values[skuIdx];

    if (!name || !sku) {
      results.errors.push(`Linha ${i + 1}: nome e SKU são obrigatórios`);
      results.skipped++;
      continue;
    }

    // Check if SKU already exists
    const existing = await prisma.product.findUnique({
      where: { companyId_sku: { companyId, sku } },
    });
    if (existing) {
      results.errors.push(`Linha ${i + 1}: SKU "${sku}" já existe`);
      results.skipped++;
      continue;
    }

    let type: ProductType = "FINISHED_PRODUCT";
    if (typeIdx >= 0 && values[typeIdx]) {
      const rawType = values[typeIdx].toUpperCase() as ProductType;
      if (validTypes.includes(rawType)) {
        type = rawType;
      }
    }

    const unit = unitIdx >= 0 && values[unitIdx] ? values[unitIdx] : "unidade";
    const costPrice = costPriceIdx >= 0 && values[costPriceIdx] ? parseFloat(values[costPriceIdx]) : undefined;
    const salePrice = salePriceIdx >= 0 && values[salePriceIdx] ? parseFloat(values[salePriceIdx]) : undefined;
    const minimumStock = minimumStockIdx >= 0 && values[minimumStockIdx] ? parseFloat(values[minimumStockIdx]) : 0;

    try {
      await prisma.product.create({
        data: {
          companyId,
          name,
          sku,
          type,
          unit,
          costPrice: costPrice && !isNaN(costPrice) ? costPrice : undefined,
          salePrice: salePrice && !isNaN(salePrice) ? salePrice : undefined,
          minimumStock: minimumStock && !isNaN(minimumStock) ? minimumStock : 0,
        },
      });
      results.created++;
    } catch (err) {
      results.errors.push(`Linha ${i + 1}: erro ao criar produto "${name}" - ${err instanceof Error ? err.message : "Erro desconhecido"}`);
      results.skipped++;
    }
  }

  revalidatePath("/inventory");
  return results;
}
