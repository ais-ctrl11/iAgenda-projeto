import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { addDays, format, startOfMonth, startOfYear, subMonths, subYears, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ENTRY_LABEL, toISODate, useStore, type AppData, type EntryType } from "@/lib/store";
import { ENTRY_FILL, PageHeader, Section } from "@/components/app/shared";
import { DayRecords } from "@/components/app/day-records";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { appointmentHasPassed } from "@/lib/calendar-math";
import { comparisonPeriods, dailyWaterAverage } from "@/lib/statistics-math";
import { activityCountsByDate, sleepWaterBuckets } from "@/lib/records-index";

export const Route = createFileRoute("/_authenticated/estatisticas")({
  head: () => ({
    meta: [
      { title: "Estatísticas — IAgenda" },
      { name: "description", content: "Gráficos de hábitos, sono e hidratação, comparações e Year in Pixels." },
      { property: "og:title", content: "Estatísticas — IAgenda" },
      { property: "og:description", content: "Gráficos de hábitos, sono e hidratação, comparações e Year in Pixels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Estatisticas,
});

const PERIODS = [{ k: 7, l: "7 dias" }, { k: 30, l: "30 dias" }, { k: 90, l: "3 meses" }, { k: 365, l: "1 ano" }] as const;

function countBetween(data: AppData, from: Date, to: Date) {
  const a = toISODate(from), b = toISODate(to);
  const inR = (d: string) => d >= a && d < b;
  return data.entries.filter((e) => inR(e.date)).length + data.habits.filter((h) => inR(h.date)).length + data.appointments.filter((x) => inR(x.date)).length;
}

function Estatisticas() {
  const { data } = useStore();
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState<number>(30);
  const [pixelDay, setPixelDay] = useState<string | null>(null);
  const now = new Date();
  const from = addDays(now, -period + 1);
  const fromIso = toISODate(from);

  const inPeriod = useMemo(() => ({
    entries: data.entries.filter((e) => e.date >= fromIso && e.date <= toISODate(now)),
    habits: data.habits.filter((h) => h.date >= fromIso && h.date <= toISODate(now)),
    appts: data.appointments.filter((a) => a.date >= fromIso && a.date <= toISODate(now) && appointmentHasPassed(a, now)),
  }), [data, fromIso]); // eslint-disable-line react-hooks/exhaustive-deps

  const byType = (Object.keys(ENTRY_LABEL) as EntryType[]).map((t) => ({ key: t, label: ENTRY_LABEL[t], value: inPeriod.entries.filter((e) => e.type === t).length, fill: ENTRY_FILL[t] }));
  const habitNames = Object.entries(inPeriod.habits.reduce<Record<string, number>>((m, h) => ((m[h.name] = (m[h.name] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Line series: per day (<=90) or per month (365)
  const series = useMemo(() => {
    const pts: { label: string; sleep: number | null; water: number }[] = [];
    const average = (b?: { sleepSum: number; sleepCount: number }) => (b?.sleepCount ? b.sleepSum / b.sleepCount : null);
    if (period <= 90) {
      const byDay = sleepWaterBuckets(data.entries, (date) => date);
      for (let i = 0; i < period; i++) {
        const day = addDays(from, i);
        const bucket = byDay.get(toISODate(day));
        pts.push({ label: format(day, "d/MM"), sleep: average(bucket), water: bucket?.water ?? 0 });
      }
    } else {
      const byMonth = sleepWaterBuckets(data.entries, (date) => date.slice(0, 7));
      for (let i = 11; i >= 0; i--) {
        const m = subMonths(startOfMonth(now), i);
        const bucket = byMonth.get(format(m, "yyyy-MM"));
        const days = i === 0 ? now.getDate() : getDaysInMonth(m);
        pts.push({ label: format(m, "MMM", { locale: ptBR }), sleep: average(bucket), water: (bucket?.water ?? 0) / days });
      }
    }
    return pts;
  }, [data, period, fromIso]); // eslint-disable-line react-hooks/exhaustive-deps

  const ws = data.prefs.weekStartsMonday ? 1 : 0;
  const { week, month } = comparisonPeriods(now, ws);
  const comps = [
    { l: "Esta semana", cur: countBetween(data, week.current, week.currentEnd), prev: countBetween(data, week.previous, week.previousEnd), ref: "semana passada" },
    { l: "Este mês", cur: countBetween(data, month.current, month.currentEnd), prev: countBetween(data, month.previous, month.previousEnd), ref: "mês passado" },
    { l: "Este ano", cur: countBetween(data, startOfYear(now), addDays(now, 1)), prev: countBetween(data, subYears(startOfYear(now), 1), startOfYear(now)), ref: "ano passado" },
  ];
  const sleepVals = inPeriod.entries.filter((e) => e.type === "sono" && e.value).map((e) => e.value ?? 0);
  const waterTotal = inPeriod.entries.filter((e) => e.type === "agua").reduce((s, e) => s + (e.value ?? 1), 0);
  const doneRate = inPeriod.appts.length ? Math.round((inPeriod.appts.filter((a) => a.done).length / inPeriod.appts.length) * 100) : null;

  return (
    <div>
      <PageHeader title="Estatísticas" subtitle="Sua rotina em números" />
      <div role="tablist" aria-label="Período" className="mb-5 flex w-full gap-1 overflow-x-auto rounded-2xl bg-muted p-1 md:w-auto md:inline-flex">
        {PERIODS.map((p) => (
          <button key={p.k} role="tab" aria-selected={period === p.k} onClick={() => setPeriod(p.k)}
            className={cn("h-11 flex-1 whitespace-nowrap rounded-xl px-4 text-sm font-semibold md:flex-none", period === p.k ? "bg-card shadow-sm" : "text-muted-foreground")}>{p.l}</button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Sono médio" value={sleepVals.length ? `${(sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length).toFixed(1)}h` : "–"} hint={`meta ${data.profile.sleepGoal}h`} />
        <Kpi label="Água por dia" value={`${dailyWaterAverage(waterTotal, period).toFixed(1)}`} hint={`meta ${data.profile.waterGoal} copos`} />
        <Kpi label="Hábitos feitos" value={String(inPeriod.habits.length)} hint="no período" />
        <Kpi label="Compromissos concluídos" value={doneRate === null ? "–" : `${doneRate}%`} hint={`${inPeriod.appts.length} no período`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Frequência de acontecimentos" className="card-soft p-4 md:p-5">
          <BarChart items={byType} />
        </Section>
        <Section title="Hábitos mais frequentes" className="card-soft p-4 md:p-5">
          {habitNames.length ? <BarChart items={habitNames.map(([n, v]) => ({ key: n, label: n, value: v, fill: "fill-habit" }))} />
            : <p className="py-8 text-center text-sm text-muted-foreground">Registre hábitos pelo botão + para vê-los aqui.</p>}
        </Section>
        <Section title={period === 365 ? "Sono médio por mês (h)" : "Horas de sono"} className="card-soft p-4 md:p-5">
          <LineChart points={series.map((p) => ({ label: p.label, value: p.sleep }))} stroke="stroke-sleep" fill="fill-sleep" unit="h" goal={data.profile.sleepGoal} />
        </Section>
        <Section title={period === 365 ? "Água média por dia (copos)" : "Copos de água"} className="card-soft p-4 md:p-5">
          <LineChart points={series.map((p) => ({ label: p.label, value: p.water }))} stroke="stroke-water" fill="fill-water" unit=" copos" goal={data.profile.waterGoal} />
        </Section>
      </div>

      <Section title="Comparações" className="mt-6">
        <div className="grid gap-3 md:grid-cols-3">
          {comps.map((c) => {
            const diff = c.cur - c.prev; const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
            return (
              <div key={c.l} className="card-soft flex items-center justify-between p-4">
                <div><p className="text-sm text-muted-foreground">{c.l}</p><p className="font-display text-2xl font-bold">{c.cur} <span className="text-sm font-normal text-muted-foreground">registros</span></p></div>
                <div className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold", diff > 0 ? "bg-done/15 text-done" : diff < 0 ? "bg-late/15 text-late" : "bg-muted text-muted-foreground")} title={`vs ${c.ref}: ${c.prev}`}>
                  <Icon className="size-4" aria-hidden />{diff > 0 ? "+" : ""}{diff}<span className="sr-only"> em relação a {c.ref}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <YearInPixels data={data} selected={pixelDay} onSelect={setPixelDay} />
        {!isMobile && <div className="card-soft p-5">{pixelDay ? <DayRecords date={pixelDay} /> : <p className="py-10 text-center text-sm text-muted-foreground">Toque em um quadrado para ver os registros do dia.</p>}</div>}
      </div>
      {isMobile && (
        <Sheet open={!!pixelDay} onOpenChange={(o) => !o && setPixelDay(null)}>
          <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-3xl px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            <SheetHeader className="sr-only"><SheetTitle>Registros do dia</SheetTitle><SheetDescription>Detalhes do dia selecionado</SheetDescription></SheetHeader>
            {pixelDay && <DayRecords date={pixelDay} />}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <div className="card-soft p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{hint}</p></div>;
}

function BarChart({ items }: { items: { key: string; label: string; value: number; fill: string }[] }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div>
      <div className="flex h-44 items-end gap-2 md:gap-3" role="list">
        {items.map((i) => (
          <button key={i.key} role="listitem" onClick={() => setActive(active === i.key ? null : i.key)} onMouseEnter={() => setActive(i.key)}
            aria-label={`${i.label}: ${i.value}`} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 focus-visible:outline-none">
            <span className={cn("text-xs font-semibold transition", active === i.key ? "opacity-100" : "opacity-60")}>{i.value}</span>
            <svg className="w-full max-w-14 overflow-visible" style={{ height: `${Math.max(4, (i.value / max) * 85)}%` }} preserveAspectRatio="none" viewBox="0 0 10 10" aria-hidden>
              <rect x="0" y="0" width="10" height="10" rx="2" className={cn(i.fill, "transition", active && active !== i.key && "opacity-40")} />
            </svg>
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2 md:gap-3">{items.map((i) => <span key={i.key} className="min-w-0 flex-1 truncate text-center text-xs text-muted-foreground">{i.label}</span>)}</div>
    </div>
  );
}

function LineChart({ points, stroke, fill, unit, goal }: { points: { label: string; value: number | null }[]; stroke: string; fill: string; unit: string; goal: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600, H = 200, P = 8;
  const max = Math.max(goal * 1.2, ...points.map((p) => p.value ?? 0), 1);
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, points.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const valid = points.map((p, i) => ({ ...p, i })).filter((p) => p.value !== null) as { label: string; value: number; i: number }[];
  const d = valid.map((p, k) => `${k ? "L" : "M"}${x(p.i)},${y(p.value)}`).join(" ");
  const h = hover !== null ? points[hover] : null;
  return (
    <div>
      <p className="mb-1 h-5 text-sm text-muted-foreground" aria-live="polite">{h ? <><b className="text-foreground">{h.label}</b>: {h.value === null ? "sem registro" : `${Number(h.value.toFixed(1))}${unit}`}</> : "Toque no gráfico para ver valores"}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full touch-none" role="img" aria-label="Gráfico de linha"
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const i = Math.round(((e.clientX - r.left) / r.width * W - P) / ((W - 2 * P) / Math.max(1, points.length - 1))); setHover(Math.max(0, Math.min(points.length - 1, i))); }}
        onPointerLeave={() => setHover(null)}>
        <line x1={P} x2={W - P} y1={y(goal)} y2={y(goal)} className="stroke-border" strokeDasharray="6 6" strokeWidth={2} />
        {valid.length > 1 && <path d={d} className={stroke} fill="none" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}
        {valid.map((p) => <circle key={p.i} cx={x(p.i)} cy={y(p.value)} r={hover === p.i ? 7 : points.length > 40 ? 2.5 : 4} className={fill} />)}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={P} y2={H - P} className="stroke-muted-foreground/40" strokeWidth={1.5} />}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground"><span>{points[0]?.label}</span><span>meta: {goal}{unit}</span><span>{points[points.length - 1]?.label}</span></div>
      {valid.length === 0 && <p className="mt-2 text-center text-sm text-muted-foreground">Sem dados no período.</p>}
    </div>
  );
}

const PIXEL = ["bg-pixel-0", "bg-pixel-1", "bg-pixel-2", "bg-pixel-3", "bg-pixel-4"];
function YearInPixels({ data, selected, onSelect }: { data: AppData; selected: string | null; onSelect: (d: string) => void }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const today = toISODate(new Date());
  const counts = useMemo(() => activityCountsByDate(data), [data]);
  return (
    <section className="card-soft p-4 md:p-5" aria-label="Year in Pixels">
      <div className="mb-3 flex items-center justify-between">
        <div><h2 className="font-display text-base font-semibold">Year in Pixels</h2><p className="text-xs text-muted-foreground">Cada quadrado é um dia; a cor indica quantos registros houve.</p></div>
        <div className="flex items-center">
          <Button size="icon" variant="ghost" className="size-11 rounded-xl" aria-label="Ano anterior" onClick={() => setYear(year - 1)}><ChevronLeft className="size-5" /></Button>
          <span className="w-12 text-center font-semibold">{year}</span>
          <Button size="icon" variant="ghost" className="size-11 rounded-xl" aria-label="Próximo ano" onClick={() => setYear(year + 1)}><ChevronRight className="size-5" /></Button>
        </div>
      </div>
      <div className="space-y-[3px]">
        {Array.from({ length: 12 }, (_, m) => {
          const n = getDaysInMonth(new Date(year, m));
          return (
            <div key={m} className="flex items-center gap-1.5">
              <span className="w-7 shrink-0 text-[10px] font-medium uppercase text-muted-foreground">{format(new Date(year, m), "MMM", { locale: ptBR })}</span>
              <div className="grid flex-1 grid-cols-[repeat(31,minmax(0,1fr))] gap-[3px]">
                {Array.from({ length: 31 }, (_, d) => {
                  if (d >= n) return <span key={d} />;
                  const iso = `${year}-${String(m + 1).padStart(2, "0")}-${String(d + 1).padStart(2, "0")}`;
                  const c = counts.get(iso) ?? 0; const lvl = c === 0 ? 0 : c <= 1 ? 1 : c <= 3 ? 2 : c <= 5 ? 3 : 4;
                  return <button key={d} onClick={() => onSelect(iso)} aria-label={`${d + 1}/${m + 1}: ${c} registros`} title={`${d + 1}/${m + 1} · ${c} registros`}
                    className={cn("aspect-square rounded-[3px] transition hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", PIXEL[lvl], iso > today && "opacity-50", selected === iso && "ring-2 ring-foreground", iso === today && "outline outline-1 outline-primary")} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">Menos {PIXEL.map((p) => <span key={p} className={cn("size-3 rounded-[3px]", p)} />)} Mais</div>
    </section>
  );
}
