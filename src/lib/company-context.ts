import { auth } from "./auth";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types/auth";

export async function getSessionUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user as unknown as SessionUser;
}

export async function getActiveCompanyId(): Promise<string> {
  const user = await getSessionUser();
  return user.activeCompanyId;
}

export async function requireCompanyAccess(companyId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user.companyIds.includes(companyId)) {
    throw new Error("Acesso negado a esta empresa");
  }
}
