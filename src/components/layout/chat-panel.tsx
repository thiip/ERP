"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { MessageSquare, Send } from "lucide-react";
import {
  getChatMessages,
  sendChatMessage,
  markChatAsRead,
  pollChatMessages,
  getUnreadChatCount,
} from "@/actions/chat";

type ChatMsg = {
  id: string;
  content: string;
  createdAt: Date;
  senderId: string;
  sender: { id: string; name: string };
};

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

export function ChatPanel({
  initialCount,
  currentUserId,
}: {
  initialCount: number;
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [count, setCount] = useState(initialCount);
  const [loaded, setLoaded] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const badgePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Click outside
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

  // Auto-scroll
  useEffect(() => {
    if (open && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // Polling when open - fetch new messages every 5s
  useEffect(() => {
    if (!open || !loaded) return;

    pollingRef.current = setInterval(async () => {
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg) return;
      try {
        const newMsgs = await pollChatMessages(
          new Date(lastMsg.createdAt).toISOString()
        );
        if (newMsgs.length > 0) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const unique = newMsgs.filter((m: ChatMsg) => !ids.has(m.id));
            return unique.length > 0 ? [...prev, ...unique] : prev;
          });
        }
      } catch {
        // ignore polling errors
      }
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [open, loaded, messages]);

  // Badge polling when closed - check unread count every 30s
  useEffect(() => {
    if (open) {
      if (badgePollingRef.current) clearInterval(badgePollingRef.current);
      return;
    }

    badgePollingRef.current = setInterval(async () => {
      try {
        const c = await getUnreadChatCount();
        setCount(c);
      } catch {
        // ignore
      }
    }, 30000);

    return () => {
      if (badgePollingRef.current) clearInterval(badgePollingRef.current);
    };
  }, [open]);

  const handleToggle = useCallback(() => {
    const willOpen = !open;
    setOpen(willOpen);

    if (willOpen) {
      if (!loaded) {
        startTransition(async () => {
          const data = await getChatMessages();
          setMessages(data as unknown as ChatMsg[]);
          setLoaded(true);
        });
      }
      // Mark as read
      startTransition(async () => {
        await markChatAsRead();
        setCount(0);
      });
    }
  }, [open, loaded, startTransition]);

  function handleSend() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    setInputValue("");
    startTransition(async () => {
      try {
        const msg = await sendChatMessage(trimmed);
        setMessages((prev) => {
          if (prev.some((m) => m.id === (msg as ChatMsg).id)) return prev;
          return [...prev, msg as unknown as ChatMsg];
        });
      } catch {
        // restore input on error
        setInputValue(trimmed);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleToggle}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.04] transition-colors"
      >
        <MessageSquare className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 rounded-xl glass-card-strong shadow-2xl z-50 overflow-hidden flex flex-col max-h-[480px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/[0.04] shrink-0">
            <span className="font-semibold text-sm text-foreground">
              Chat da Empresa
            </span>
            <span className="text-[10px] text-foreground/30">
              {messages.length} mensagens
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {isPending && !loaded ? (
              <div className="p-6 text-center text-sm text-foreground/30">
                Carregando...
              </div>
            ) : messages.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-foreground/15" />
                <p className="text-sm text-foreground/30">
                  Nenhuma mensagem ainda
                </p>
                <p className="text-xs text-foreground/20 mt-1">
                  Envie a primeira mensagem!
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  isOwn={m.senderId === currentUserId}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-foreground/[0.04] px-3 py-2 shrink-0">
            <div className="flex items-center gap-2">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite uma mensagem..."
                className="flex-1 bg-foreground/[0.04] rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/30 outline-none focus:bg-foreground/[0.06] transition-colors"
                maxLength={2000}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isPending}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.04] transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  isOwn,
}: {
  message: ChatMsg;
  isOwn: boolean;
}) {
  const initial = message.sender.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
          isOwn
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-indigo-500/20 text-indigo-400"
        }`}
      >
        {initial}
      </div>
      <div
        className={`min-w-0 max-w-[75%] ${isOwn ? "text-right" : "text-left"}`}
      >
        <div
          className={`flex items-baseline gap-2 ${isOwn ? "justify-end" : ""}`}
        >
          <span className="text-[11px] font-medium text-foreground/50">
            {isOwn ? "Voce" : message.sender.name}
          </span>
          <span className="text-[10px] text-foreground/25">
            {timeAgo(message.createdAt)}
          </span>
        </div>
        <div
          className={`mt-0.5 rounded-xl px-3 py-1.5 text-sm leading-relaxed ${
            isOwn
              ? "bg-emerald-500/10 text-foreground/85"
              : "bg-foreground/[0.04] text-foreground/80"
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}
