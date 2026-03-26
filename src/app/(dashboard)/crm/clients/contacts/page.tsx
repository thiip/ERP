import Link from "next/link";
import { Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getContacts } from "@/actions/crm";

export default async function ContactsPage() {
  const contacts = await getContacts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Contatos</h2>
          <p className="text-muted-foreground">
            Gerencie os contatos do CRM
          </p>
        </div>
        <Button render={<Link href="/crm/clients/contacts/new" />}>
          <Plus className="h-4 w-4" />
          Novo Contato
        </Button>
      </div>

      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">Nenhum contato cadastrado.</p>
          <Button
            variant="outline"
            className="mt-4"
            render={<Link href="/crm/clients/contacts/new" />}
          >
            <Plus className="h-4 w-4" />
            Criar primeiro contato
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/crm/clients/contacts/${contact.id}`}
                    className="text-primary hover:underline"
                  >
                    {contact.name}
                  </Link>
                </TableCell>
                <TableCell>
                  {contact.organization?.name ?? "-"}
                </TableCell>
                <TableCell>{contact.position ?? "-"}</TableCell>
                <TableCell>{contact.phone ?? "-"}</TableCell>
                <TableCell>{contact.email ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={
                      <Link href={`/crm/clients/contacts/${contact.id}`} />
                    }
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
