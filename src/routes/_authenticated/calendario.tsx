import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { toISODate, useStore, type ImportantDay } from "@/lib/store";
import { ENTRY_DOT, PageHeader } from "@/components/app/shared";
import { DayRecords } from "@/components/app/day-records";
import { cn } from "@/lib/utils";
import { monthCells } from "@/lib/calendar-math";
import { indexRecordsByDate, type DayRecordsIndex } from "@/lib/records-index";

const NO_RECORDS: DayRecordsIndex = { appointments: [], entries: [], habits: [] };
const NO_IMPORTANT: ImportantDay[] = [];

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário — IAgenda" },
      { name: "description", content: "Visualização mensal e semanal dos seus compromissos e registros." },
      { property: "og:title", content: "Calendário — IAgenda" },
      { property: "og:description", content: "Visualização mensal e semanal dos seus compromissos e registros." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Calendario,
});

function Calendario() {
  const { data } = useStore();
  const [view, setView] = useState<"mes" | "semana" | "ano">(data.prefs.calendarView);
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => toISODate(new Date()));
  const ws = data.prefs.weekStartsMonday ? 1 : 0;
  const today = toISODate(new Date());
  // Group once per data change instead of filtering all records for every calendar cell.
  const records = useMemo(() => indexRecordsByDate(data), [data]);
  const importantByDate = useMemo(() => {
    const map = new Map<string, ImportantDay[]>();
    for (const x of data.importantDays) {
      const list = map.get(x.date);
      if (list) list.push(x);
      else map.set(x.date, [x]);
    }
    return map;
  }, [data.importantDays]);

  const start = view === "mes" ? startOfWeek(startOfMonth(cursor), { weekStartsOn: ws }) : startOfWeek(cursor, { weekStartsOn: ws });
  const end = view === "mes" ? endOfWeek(endOfMonth(cursor), { weekStartsOn: ws }) : endOfWeek(cursor, { weekStartsOn: ws });
  const days: Date[] = []; for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const weekdays = Array.from({ length: 7 }, (_, i) => format(addDays(start, i), "EEEEEE", { locale: ptBR }));
  const move = (n: number) => setCursor((c) => view === "ano" ? new Date(c.getFullYear() + n, c.getMonth(), 1) : view === "mes" ? addMonths(c, n) : addWeeks(c, n));

  return (
    <div>
      <PageHeader title="Calendário" subtitle={format(cursor, view === "ano" ? "yyyy" : view === "mes" ? "MMMM 'de' yyyy" : "'Semana de' d 'de' MMM", { locale: ptBR })} actions={
        <Button variant="outline" className="h-11 rounded-xl" onClick={() => { setCursor(new Date()); setSelected(today); }}>Hoje</Button>
      } />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card-soft p-3 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Button size="icon" variant="ghost" className="size-11 rounded-xl" aria-label="Anterior" onClick={() => move(-1)}><ChevronLeft className="size-5" /></Button>
            <div role="tablist" aria-label="Visualização" className="inline-flex rounded-xl bg-muted p-1">
              {(["mes", "semana", "ano"] as const).map((v) => (
                <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn("h-10 rounded-lg px-3 text-sm font-semibold", view === v ? "bg-card shadow-sm" : "text-muted-foreground")}>{v === "mes" ? "Mês" : v === "ano" ? "Ano" : "Semana"}</button>
              ))}
            </div>
            <Button size="icon" variant="ghost" className="size-11 rounded-xl" aria-label="Próximo" onClick={() => move(1)}><ChevronRight className="size-5" /></Button>
          </div>
          {view === "ano" ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }, (_, month) => {
              const monthDate = new Date(cursor.getFullYear(), month, 1);
              const first = startOfWeek(monthDate, { weekStartsOn: ws });
              const cells = monthCells(monthDate, ws);
              return <section key={month} className="rounded-2xl border p-3"><button className="mb-2 font-semibold capitalize text-primary" onClick={() => { setCursor(monthDate); setView("mes"); }}>{format(monthDate, "MMMM", { locale: ptBR })}</button><div className="grid grid-cols-7 text-center text-[10px] text-muted-foreground">{Array.from({ length: 7 }, (_, i) => <span key={i}>{format(addDays(first, i), "EEEEE", { locale: ptBR })}</span>)}</div><div className="grid grid-cols-7 text-center text-xs">{cells.map((d,i)=>{ const iso=toISODate(d); const important=importantByDate.has(iso.slice(5)); return <button key={i} onClick={()=>{setSelected(iso);setCursor(monthDate)}} aria-label={`${iso}${important?", data importante":""}`} className={cn("m-0.5 grid aspect-square place-items-center rounded-full", !isSameMonth(d,monthDate)&&"opacity-25", iso===today&&"bg-primary text-primary-foreground", important&&"ring-2 ring-accent")}>{d.getDate()}</button>; })}</div></section>;
            })}
          </div> : <>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-muted-foreground">
            {weekdays.map((w, i) => <div key={i} className="py-2">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const iso = toISODate(d); const r = records.get(iso) ?? NO_RECORDS; const important = importantByDate.get(iso.slice(5)) ?? NO_IMPORTANT;
              const inMonth = view === "semana" || isSameMonth(d, cursor);
              return (
                <button key={iso} onClick={() => setSelected(iso)} aria-pressed={selected === iso}
                  aria-label={`${format(d, "d 'de' MMMM", { locale: ptBR })}: ${r.appointments.length + r.entries.length + r.habits.length} registros`}
                  className={cn("flex flex-col items-center gap-1 rounded-xl p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    view === "mes" ? "min-h-12 md:min-h-20 md:items-start md:p-2" : "min-h-20 md:min-h-32 md:items-start md:p-2",
                    selected === iso ? "bg-primary-soft ring-2 ring-primary" : important.length > 0 ? "bg-accent/40 hover:bg-accent/60" : "hover:bg-muted", !inMonth && "opacity-40")}>
                  <span className={cn("grid size-7 place-items-center rounded-full text-sm font-semibold", iso === today && "bg-primary text-primary-foreground")}>{format(d, "d")}</span>
                  <span className="flex flex-wrap justify-center gap-0.5 md:justify-start">
                    {r.appointments.length > 0 && <span className="size-1.5 rounded-full bg-future md:size-2" />}
                    {r.entries.slice(0, 3).map((e) => <span key={e.id} className={cn("size-1.5 rounded-full md:size-2", ENTRY_DOT[e.type])} />)}
                    {r.habits.length > 0 && <span className="size-1.5 rounded-full bg-habit md:size-2" />}
                    {important.length > 0 && <span className="size-1.5 rounded-full bg-accent-foreground md:size-2" title={important.map((x) => x.name).join(", ")} />}
                  </span>
                  {important.length > 0 && <span className="hidden w-full truncate rounded bg-accent px-1 text-left text-[11px] font-medium text-accent-foreground md:block">{important[0]?.name}{important.length > 1 ? ` +${important.length - 1}` : ""}</span>}
                  {view === "semana" && <span className="hidden w-full space-y-0.5 text-left md:block">
                    {r.appointments.slice(0, 3).map((a) => <span key={a.id} className="block truncate rounded bg-future/15 px-1 text-xs text-future">{a.time} {a.title}</span>)}
                  </span>}
                </button>
              );
            })}
          </div>
          </>}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {[["bg-future", "Compromisso"], ["bg-water", "Água"], ["bg-sleep", "Sono"], ["bg-food", "Alimentação"], ["bg-exercise", "Exercício"], ["bg-habit", "Hábito"], ["bg-accent-foreground", "Dia importante"]].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1.5"><span className={cn("size-2 rounded-full", c)} />{l}</span>
            ))}
          </div>
        </div>
        <div className="lg:card-soft lg:p-5">
          {(importantByDate.get(selected.slice(5)) ?? NO_IMPORTANT).map((x) => <p key={x.id} className="mb-3 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground">🎉 {x.name}</p>)}
          <DayRecords date={selected} /></div>
      </div>
    </div>
  );
}
