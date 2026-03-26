import Link from "next/link";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationBell } from "@/components/layout/notification-bell";
import { getSessionUser } from "@/lib/company-context";
import { getUnreadNotificationCount } from "@/actions/notifications";
import { prisma } from "@/lib/prisma";
import { Mail, Calendar, Plus } from "lucide-react";
import { NewRecordDropdown } from "@/components/layout/new-record-dropdown";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ChatPanel } from "@/components/layout/chat-panel";
import { getUnreadChatCount } from "@/actions/chat";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  const [companies, unreadCount, unreadChatCount] = await Promise.all([
    prisma.company.findMany({
      where: { id: { in: user.companyIds } },
      select: { id: true, name: true },
    }),
    getUnreadNotificationCount(),
    getUnreadChatCount(),
  ]);

  return (
    <div className="flex min-h-svh w-full">
      <AppSidebar
        companies={companies}
        userRole={user.role}
        userName={user.name}
      />

      <main className="flex-1 ml-[260px] overflow-auto">
        {/* Minimal top bar */}
        <div className="sticky top-0 z-30 glass-card-strong">
          <div className="flex h-12 items-center gap-3 px-6">
            {/* Spacer / breadcrumb area */}
            <div className="flex-1" />

            {/* New Record */}
            <NewRecordDropdown />

            {/* Right side icons */}
            <div className="flex items-center gap-0.5">
              <Link
                href="/settings/email"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.04] transition-colors"
              >
                <Mail className="h-4 w-4" />
              </Link>
              <NotificationBell initialCount={unreadCount} />
              <ChatPanel initialCount={unreadChatCount} currentUserId={user.id} />
              <Link
                href="/calendar"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.04] transition-colors"
              >
                <Calendar className="h-4 w-4" />
              </Link>

              {/* Separator */}
              <div className="h-5 w-px bg-foreground/10 mx-1" />

              {/* Theme Toggle */}
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="p-6">{children}</div>
      </main>

      {/* Command palette (global overlay) */}
      <GlobalSearch />
    </div>
  );
}
