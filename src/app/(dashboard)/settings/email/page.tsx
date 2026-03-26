import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { getEmailConfig } from "@/actions/email-config";
import { EmailConfigForm } from "./email-config-form";

export default async function EmailSettingsPage() {
  const config = await getEmailConfig();

  return (
    <div>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-foreground/50 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Configuracao de Email</h1>
          <p className="text-sm text-muted-foreground">
            Configure suas credenciais IMAP e SMTP para integracao de email.
          </p>
        </div>
      </div>

      <EmailConfigForm
        config={
          config
            ? {
                imapHost: config.imapHost,
                imapPort: config.imapPort,
                imapUser: config.imapUser,
                imapPassword: config.imapPassword,
                smtpHost: config.smtpHost,
                smtpPort: config.smtpPort,
                smtpUser: config.smtpUser,
                smtpPassword: config.smtpPassword,
                fromName: config.fromName || "",
                isActive: config.isActive,
              }
            : null
        }
      />
    </div>
  );
}
