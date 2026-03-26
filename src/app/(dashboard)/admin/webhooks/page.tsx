import Link from "next/link"
import { ArrowLeft, Webhook } from "lucide-react"
import {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  toggleWebhook,
  getAvailableWebhookEvents,
} from "@/actions/admin"
import { WebhookList } from "./webhook-list"

export default async function WebhooksPage() {
  const [webhooks, availableEvents] = await Promise.all([
    getWebhooks(),
    getAvailableWebhookEvents(),
  ])

  return (
    <div className="min-h-screen bg-foreground/[0.03]/60 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-foreground/50 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Administração
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Webhooks
          </h1>
          <p className="mt-1 text-sm text-foreground/50">
            Configure endpoints para receber notificações de eventos do sistema.
          </p>
        </div>

        <WebhookList
          webhooks={JSON.parse(JSON.stringify(webhooks))}
          availableEvents={availableEvents}
          createAction={createWebhook}
          updateAction={updateWebhook}
          deleteAction={deleteWebhook}
          toggleAction={toggleWebhook}
        />
      </div>
    </div>
  )
}
