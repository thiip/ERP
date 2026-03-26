"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/company-context";
import { revalidatePath } from "next/cache";

export async function getUnreadNotificationCount() {
  const user = await getSessionUser();
  return prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });
}

export async function getNotifications(limit = 20) {
  const user = await getSessionUser();
  return prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markNotificationAsRead(notificationId: string) {
  const user = await getSessionUser();
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { isRead: true },
  });
  revalidatePath("/");
}

export async function markAllNotificationsAsRead() {
  const user = await getSessionUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/");
}

export async function createMentionNotifications(
  text: string,
  sourceLink: string,
  sourceLabel: string
) {
  const user = await getSessionUser();
  const mentionedNames = parseMentions(text);
  if (mentionedNames.length === 0) return;

  const mentionedUsers = await prisma.user.findMany({
    where: {
      name: { in: mentionedNames, mode: "insensitive" },
      isActive: true,
      id: { not: user.id },
    },
    select: { id: true, name: true },
  });

  if (mentionedUsers.length === 0) return;

  await prisma.notification.createMany({
    data: mentionedUsers.map((u) => ({
      userId: u.id,
      type: "MENTION" as const,
      title: `${user.name} mencionou voce`,
      message: `em ${sourceLabel}`,
      link: sourceLink,
    })),
  });
}

export async function searchUsersForMention(query: string) {
  const user = await getSessionUser();
  return prisma.user.findMany({
    where: {
      name: { contains: query, mode: "insensitive" },
      isActive: true,
      companyAccess: { some: { companyId: { in: user.companyIds } } },
    },
    select: { id: true, name: true },
    take: 5,
  });
}

function parseMentions(text: string): string[] {
  const regex = /@([\w\u00C0-\u024F]+(?:\s[\w\u00C0-\u024F]+)?)/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1].trim());
  }
  return [...new Set(matches)];
}
