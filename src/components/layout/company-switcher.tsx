"use client";

import { useSession } from "next-auth/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

type CompanyOption = {
  id: string;
  name: string;
};

export function CompanySwitcher({
  companies,
}: {
  companies: CompanyOption[];
}) {
  const { data: session, update } = useSession();

  if (!session || companies.length <= 1) {
    return (
      <div className="px-2 py-1 text-sm font-medium text-foreground/60">
        {companies[0]?.name || "Empresa"}
      </div>
    );
  }

  const activeId = (session.user as Record<string, unknown>)
    .activeCompanyId as string;
  const activeName =
    companies.find((c) => c.id === activeId)?.name || "Selecione";

  return (
    <Select
      value={activeId}
      onValueChange={async (value) => {
        await update({ activeCompanyId: value });
        window.location.reload();
      }}
    >
      <SelectTrigger className="w-full bg-foreground/[0.04] border-foreground/[0.06] text-foreground/70 text-sm">
        <span>{activeName}</span>
      </SelectTrigger>
      <SelectContent>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            {company.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
