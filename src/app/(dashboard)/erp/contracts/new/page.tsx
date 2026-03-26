import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";
import { createContract } from "@/actions/erp";
import { redirect } from "next/navigation";
import { ContractForm } from "@/components/erp/contract-form";

export default async function NewContractPage() {
  const companyId = await getActiveCompanyId();

  const [contacts, deals] = await Promise.all([
    prisma.contact.findMany({
      where: {
        companies: { some: { companyId } },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.deal.findMany({
      where: { companyId },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  async function handleCreate(formData: FormData) {
    "use server";
    await createContract(formData);
    redirect("/erp/contracts");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Novo Contrato</h2>
        <p className="text-muted-foreground">
          Preencha os dados para cadastrar um novo contrato
        </p>
      </div>
      <ContractForm
        contacts={contacts}
        deals={deals}
        action={handleCreate}
      />
    </div>
  );
}
