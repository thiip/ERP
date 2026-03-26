"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/actions/notifications";
import { useRouter } from "next/navigation";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
};

export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [count, setCount] = useState(initialCount);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleToggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && !loaded) {
      startTransition(async () => {
        const data = await getNotifications();
        setNotifications(data as unknown as NotificationItem[]);
        setLoaded(true);
      });
    }
  }

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setCount((c) => Math.max(0, c - 1));
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setCount(0);
    });
  }

  function handleClickNotification(n: NotificationItem) {
    if (!n.isRead) handleMarkRead(n.id);
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  }

  function timeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleToggle}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.04] transition-colors"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500/100 text-[10px] font-bold text-white px-1">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl glass-card-strong shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/[0.04]">
            <span className="font-semibold text-sm text-foreground">Notificacoes</span>
            {count > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-medium"
                disabled={isPending}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {isPending && !loaded ? (
              <div className="p-6 text-center text-sm text-foreground/30">
                Carregando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-foreground/15" />
                <p className="text-sm text-foreground/30">Nenhuma notificacao</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-white/[0.03] last:border-0 cursor-pointer hover:bg-foreground/[0.03] transition-colors ${
                    !n.isRead ? "bg-green-500/100/5" : ""
                  }`}
                >
                  <div
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      !n.isRead ? "bg-green-400" : "bg-transparent"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground/80 truncate">
                      {n.title}
                    </p>
                    <p className="text-xs text-foreground/40 truncate">{n.message}</p>
                    <p className="text-xs text-foreground/25 mt-0.5">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkRead(n.id);
                      }}
                      className="mt-1 shrink-0 text-foreground/25 hover:text-green-400"
                      title="Marcar como lida"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
