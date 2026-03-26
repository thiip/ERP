"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Users,
  MessageCircle,
  StickyNote,
  FileText,
  FileSignature,
  Factory,
  Handshake,
  ScrollText,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getCalendarEvents,
  type CalendarEvent,
  type CalendarEventType,
} from "@/actions/calendar";

// ── helpers ──────────────────────────────────────────────────────────

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function formatDate(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const typeLabels: Record<CalendarEventType, string> = {
  followup: "Follow-up",
  invoice_due: "Fatura",
  contract_start: "Contrato (Início)",
  contract_end: "Contrato (Fim)",
  production_requested: "Ordem de Produção",
  deal_expected_close: "Negócio (Previsão)",
  proposal_valid_until: "Proposta (Validade)",
};

function getEventIcon(type: CalendarEventType) {
  switch (type) {
    case "followup":
      return Phone;
    case "invoice_due":
      return FileText;
    case "contract_start":
    case "contract_end":
      return FileSignature;
    case "production_requested":
      return Factory;
    case "deal_expected_close":
      return Handshake;
    case "proposal_valid_until":
      return ScrollText;
    default:
      return CalendarIcon;
  }
}

// ── component ────────────────────────────────────────────────────────

export function CalendarView() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [view, setView] = useState<"month" | "agenda">("month");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch a wider range to cover visible days from adjacent months
      const start = new Date(currentMonth);
      start.setDate(start.getDate() - 7);
      const end = endOfMonth(currentMonth);
      end.setDate(end.getDate() + 7);

      const data = await getCalendarEvents({
        start: start.toISOString(),
        end: end.toISOString(),
      });
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Navigation
  function prevMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
    setSelectedDate(null);
  }
  function nextMonth() {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
    setSelectedDate(null);
  }
  function goToToday() {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  }

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());
  const calendarEnd = new Date(monthEnd);
  calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()));

  const weeks: Date[][] = [];
  const cursor = new Date(calendarStart);
  while (cursor <= calendarEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  function eventsForDate(d: Date) {
    return events.filter((e) => isSameDay(new Date(e.date), d));
  }

  const selectedEvents = selectedDate ? eventsForDate(selectedDate) : [];

  // Agenda view: group events by date
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const dateKey = new Date(ev.date).toISOString().slice(0, 10);
    if (!eventsByDate.has(dateKey)) eventsByDate.set(dateKey, []);
    eventsByDate.get(dateKey)!.push(ev);
  }
  const sortedDates = [...eventsByDate.keys()].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Calendário</h2>
          <p className="text-muted-foreground">
            Visão geral de todos os eventos do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("month")}
          >
            Mês
          </Button>
          <Button
            variant={view === "agenda" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("agenda")}
          >
            Agenda
          </Button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[200px] text-center">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoje
          </Button>
        </div>
        {loading && (
          <span className="text-sm text-muted-foreground animate-pulse">
            Carregando eventos...
          </span>
        )}
      </div>

      {view === "month" ? (
        <div className="flex gap-6">
          {/* Calendar grid */}
          <div className="flex-1">
            <div className="grid grid-cols-7 border rounded-lg overflow-hidden">
              {/* Week day headers */}
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-medium text-muted-foreground bg-muted/50 border-b"
                >
                  {day}
                </div>
              ))}

              {/* Day cells */}
              {weeks.map((week, wi) =>
                week.map((day, di) => {
                  const isCurrentMonth =
                    day.getMonth() === currentMonth.getMonth();
                  const isToday = isSameDay(day, today);
                  const isSelected =
                    selectedDate && isSameDay(day, selectedDate);
                  const dayEvents = eventsForDate(day);

                  return (
                    <button
                      key={`${wi}-${di}`}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        min-h-[90px] p-1.5 text-left border-b border-r transition-colors
                        ${!isCurrentMonth ? "bg-muted/30 text-muted-foreground/50" : "hover:bg-muted/40"}
                        ${isSelected ? "bg-emerald-500/10 ring-2 ring-emerald-500 ring-inset" : ""}
                      `}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`
                            text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                            ${isToday ? "bg-emerald-600 text-white" : ""}
                          `}
                        >
                          {day.getDate()}
                        </span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <div
                            key={ev.id}
                            className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate text-white ${ev.color}`}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground pl-1">
                            +{dayEvents.length - 3} mais
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Side panel: selected day events */}
          <div className="w-80 shrink-0">
            <div className="sticky top-20 rounded-lg border bg-card p-4 space-y-3">
              <h4 className="font-semibold text-sm">
                {selectedDate
                  ? formatDate(selectedDate)
                  : "Selecione um dia"}
              </h4>

              {selectedDate && selectedEvents.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum evento neste dia.
                </p>
              )}

              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {selectedEvents.map((ev) => {
                  const Icon = getEventIcon(ev.type);
                  const time = new Date(ev.date).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={ev.id}
                      className="rounded-md border p-3 space-y-1.5 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={`mt-0.5 rounded p-1 text-white ${ev.color}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight truncate">
                            {ev.title}
                          </p>
                          {ev.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {ev.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px]">
                          {typeLabels[ev.type]}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {time}
                        </span>
                      </div>
                      {ev.href && (
                        <Link
                          href={ev.href}
                          className="text-[10px] text-emerald-600 hover:underline"
                        >
                          Ver detalhes →
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Agenda View */
        <div className="space-y-4">
          {sortedDates.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <CalendarIcon className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                Nenhum evento neste mês.
              </p>
            </div>
          )}

          {sortedDates.map((dateKey) => {
            const dayDate = new Date(dateKey + "T12:00:00");
            const dayEvents = eventsByDate.get(dateKey) ?? [];
            const isToday = isSameDay(dayDate, today);

            return (
              <div key={dateKey} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`
                      text-xs font-semibold px-2 py-1 rounded
                      ${isToday ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}
                    `}
                  >
                    {dayDate.toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {dayEvents.length} evento{dayEvents.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-1.5 pl-4 border-l-2 border-muted ml-2">
                  {dayEvents.map((ev) => {
                    const Icon = getEventIcon(ev.type);
                    const time = new Date(ev.date).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={ev.id}
                        className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/30 transition-colors"
                      >
                        <div
                          className={`rounded p-1.5 text-white shrink-0 ${ev.color}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {ev.title}
                          </p>
                          {ev.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {ev.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {typeLabels[ev.type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {time}
                        </span>
                        {ev.href && (
                          <Link
                            href={ev.href}
                            className="text-xs text-emerald-600 hover:underline shrink-0"
                          >
                            Ver →
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
        <span className="text-xs text-muted-foreground font-medium">Legenda:</span>
        {[
          { color: "bg-emerald-500/100", label: "Follow-ups" },
          { color: "bg-yellow-500/100", label: "Faturas" },
          { color: "bg-emerald-500", label: "Contratos (Início)" },
          { color: "bg-orange-500/100", label: "Contratos (Fim)" },
          { color: "bg-teal-500/100", label: "Produção" },
          { color: "bg-teal-500/100", label: "Negócios" },
          { color: "bg-rose-500/100", label: "Propostas" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
            <span className="text-[11px] text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
