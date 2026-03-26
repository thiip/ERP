import { createOrganization } from "@/actions/crm";
import { redirect } from "next/navigation";
import { OrganizationForm } from "@/components/crm/organization-form";

export default function NewOrganizationPage() {
  async function handleCreate(formData: FormData) {
    "use server";
    await createOrganization(formData);
    redirect("/crm/clients/organizations");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Nova Empresa</h2>
        <p className="text-muted-foreground">
          Preencha os dados para cadastrar uma nova empresa
        </p>
      </div>
      <OrganizationForm action={handleCreate} />
    </div>
  );
}
