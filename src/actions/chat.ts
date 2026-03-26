"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser, getActiveCompanyId } from "@/lib/company-context";

export async function getUnreadChatCount() {
  const user = await getSessionUser();
  const companyId = await getActiveCompanyId();

  const receipt = await prisma.chatReadReceipt.findUnique({
    where: { userId_companyId: { userId: user.id, companyId } },
  });

  const lastReadAt = receipt?.lastReadAt ?? new Date(0);

  return prisma.chatMessage.count({
    where: {
      companyId,
      createdAt: { gt: lastReadAt },
      senderId: { not: user.id },
    },
  });
}

export async function getChatMessages(limit = 50) {
  const companyId = await getActiveCompanyId();

  return prisma.chatMessage.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      sender: { select: { id: true, name: true } },
    },
  });
}

export async function sendChatMessage(content: string) {
  const user = await getSessionUser();
  const companyId = await getActiveCompanyId();

  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 2000) {
    throw new Error("Mensagem invalida");
  }

  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: { companyId, senderId: user.id, content: trimmed },
      include: { sender: { select: { id: true, name: true } } },
    }),
    prisma.chatReadReceipt.upsert({
      where: { userId_companyId: { userId: user.id, companyId } },
      create: { userId: user.id, companyId, lastReadAt: new Date() },
      update: { lastReadAt: new Date() },
    }),
  ]);

  return message;
}

export async function markChatAsRead() {
  const user = await getSessionUser();
  const companyId = await getActiveCompanyId();

  await prisma.chatReadReceipt.upsert({
    where: { userId_companyId: { userId: user.id, companyId } },
    create: { userId: user.id, companyId, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });
}

export async function pollChatMessages(afterTimestamp: string) {
  const companyId = await getActiveCompanyId();

  return prisma.chatMessage.findMany({
    where: {
      companyId,
      createdAt: { gt: new Date(afterTimestamp) },
    },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true } },
    },
  });
}
