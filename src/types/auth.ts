import { Role } from "@/generated/prisma/client";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyIds: string[];
  activeCompanyId: string;
};
