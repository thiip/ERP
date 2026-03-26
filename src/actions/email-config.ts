"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/company-context";
import { revalidatePath } from "next/cache";

export async function getEmailConfig() {
  const user = await getSessionUser();
  const config = await prisma.emailConfig.findUnique({
    where: { userId: user.id },
  });
  return config;
}

export async function saveEmailConfig(formData: FormData) {
  const user = await getSessionUser();

  const data = {
    imapHost: (formData.get("imapHost") as string) || "",
    imapPort: parseInt(formData.get("imapPort") as string) || 993,
    imapUser: (formData.get("imapUser") as string) || "",
    imapPassword: (formData.get("imapPassword") as string) || "",
    smtpHost: (formData.get("smtpHost") as string) || "",
    smtpPort: parseInt(formData.get("smtpPort") as string) || 587,
    smtpUser: (formData.get("smtpUser") as string) || "",
    smtpPassword: (formData.get("smtpPassword") as string) || "",
    fromName: (formData.get("fromName") as string) || null,
  };

  const result = await prisma.emailConfig.upsert({
    where: { userId: user.id },
    update: data,
    create: { ...data, userId: user.id },
  });

  revalidatePath("/settings/email");
  return result;
}

export async function toggleEmailActive(isActive: boolean) {
  const user = await getSessionUser();
  await prisma.emailConfig.update({
    where: { userId: user.id },
    data: { isActive },
  });
  revalidatePath("/settings/email");
}

export async function deleteEmailConfig() {
  const user = await getSessionUser();
  await prisma.emailConfig.deleteMany({
    where: { userId: user.id },
  });
  revalidatePath("/settings/email");
}
