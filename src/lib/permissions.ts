import { Role } from "@/generated/prisma/client";

type Module = "crm" | "inventory" | "production" | "financial" | "settings";
type Action = "read" | "write";

const permissions: Record<Role, Record<Module, Action[]>> = {
  ADMIN: {
    crm: ["read", "write"],
    inventory: ["read", "write"],
    production: ["read", "write"],
    financial: ["read", "write"],
    settings: ["read", "write"],
  },
  MANAGER: {
    crm: ["read", "write"],
    inventory: ["read", "write"],
    production: ["read", "write"],
    financial: ["read", "write"],
    settings: [],
  },
  SALES: {
    crm: ["read", "write"],
    inventory: ["read"],
    production: [],
    financial: [],
    settings: [],
  },
  PRODUCTION: {
    crm: [],
    inventory: ["read", "write"],
    production: ["read", "write"],
    financial: [],
    settings: [],
  },
  FINANCE: {
    crm: [],
    inventory: ["read"],
    production: [],
    financial: ["read", "write"],
    settings: [],
  },
};

export function hasPermission(
  role: Role,
  module: Module,
  action: Action
): boolean {
  return permissions[role]?.[module]?.includes(action) ?? false;
}

export function getAccessibleModules(role: Role): Module[] {
  return (Object.keys(permissions[role]) as Module[]).filter(
    (mod) => permissions[role][mod].length > 0
  );
}
