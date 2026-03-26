import { prisma } from "@/lib/prisma";
import { getActiveCompanyId } from "@/lib/company-context";
import { createInvoice } from "@/actions/erp";
import { redirect } from "next/navigation";
import { InvoiceForm } from "@/components/erp/invoice-form";

export default async function NewInvoicePage() {
  const companyId = await getActiveCompanyId();

  const contacts = await prisma.contact.findMany({
    where: {
      companies: { some: { companyId } },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  async function handleCreate(formData: FormData) {
    "use server";
    await createInvoice(formData);
    redirect("/erp/invoices");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Nova Fatura</h2>
        <p className="text-muted-foreground">
          Preencha os dados para cadastrar uma nova fatura
        </p>
      </div>
      <InvoiceForm contacts={contacts} action={handleCreate} />
    </div>
  );
}
