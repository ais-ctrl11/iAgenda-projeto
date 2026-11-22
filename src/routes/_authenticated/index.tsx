import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarCheck2, Droplets, Bed, Plus, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { appointmentStatus, toISODate, useStore, type AppointmentStatus } from "@/lib/store";
import { AppointmentCard, AppointmentDetail } from "@/components/app/appointment-parts";
import { EmptyState, PageHeader, Section } from "@/components/app/shared";
import { useAdd } from "@/components/app/add-flow";
import { todayLabel } from "@/components/app/shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Compromissos — IAgenda" },
      { name: "description", content: "Seus compromissos futuros, atrasados e concluídos em ordem cronológica." },
      { property: "og:title", content: "Compromissos — IAgenda" },
      { property: "og:description", content: "Seus compromissos futuros, atrasados e concluídos em ordem cronológica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Compromissos,
});

type Tab = "ativos" | "concluidos" | "historico";
const GROUPS: { key: AppointmentStatus; title: string }[] = [
  { key: "atrasado", title: "Atrasados" }, { key: "futuro", title: "Próximos" },
];

function Compromissos() {
  const { data, ready } = useStore();
  const { open } = useAdd();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<Tab>("ativos");
  const [selected, setSelected] = useState<string | null>(null);
  const today = toISODate(new Date());

  const sorted = useMemo(() => [...data.appointments].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)), [data.appointments]);
  const withStatus = sorted.map((a) => ({ a, st: appointmentStatus(a) }));
  const water = data.entries.filter((e) => e.type === "agua" && e.date === today).reduce((s, e) => s + (e.value ?? 1), 0);
  // Most recent sleep entry (first one wins on ties), without copying and sorting every entry.
  const lastSleep = data.entries.reduce<(typeof data.entries)[number] | undefined>((best, e) => {
    if (e.type !== "sono") return best;
    return !best || (e.date + e.time).localeCompare(best.date + best.time) > 0 ? e : best;
  }, undefined);
  const todayCount = withStatus.filter((x) => x.a.date === today).length;
  const sel = data.appointments.find((a) => a.id === selected) ?? null;

  const list = (() => {
    if (tab === "concluidos") return [{ title: "Concluídos", items: withStatus.filter((x) => x.st === "concluido").reverse() }];
    if (tab === "historico") return [{ title: "Histórico (anteriores)", items: withStatus.filter((x) => x.st === "expirado" || (x.st === "concluido" && x.a.date < today)).reverse() }];
    return GROUPS.map((g) => ({ title: g.title, items: withStatus.filter((x) => x.st === g.key) }));
  })();
  const empty = list.every((g) => g.items.length === 0);

  return (
    <div>
      <PageHeader title="Compromissos" subtitle={ready ? todayLabel() : undefined} actions={
        <Button className="hidden h-11 rounded-xl md:inline-flex" onClick={() => open("compromisso")}><Plus className="size-4" />Novo compromisso</Button>
      } />

      {data.prefs.showSummary && <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat icon={CalendarCheck2} label="Hoje" value={ready ? String(todayCount) : "–"} sub="compromissos" cls="bg-future/15 text-future" />
        <Stat icon={Droplets} label="Água" value={ready ? `${water}/${data.profile.waterGoal}` : "–"} sub="copos" cls="bg-water/15 text-water" progress={water / Math.max(1, data.profile.waterGoal)} />
        <Stat icon={Bed} label="Último sono" value={lastSleep?.value ? `${lastSleep.value}h` : "–"} sub={lastSleep?.quality ? `qualidade ${lastSleep.quality}` : "sem registro"} cls="bg-sleep/15 text-sleep" />
      </div>}

      <div role="tablist" aria-label="Filtro" className="segmented-control mb-5 inline-flex w-full rounded-2xl bg-muted p-1 md:w-auto">
        {([["ativos", "Ativos"], ["concluidos", "Concluídos"], ["historico", "Histórico"]] as const).map(([k, l]) => (
          <Button variant="ghost" key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={cn("h-11 min-w-0 flex-1 rounded-xl px-2 text-sm font-semibold transition sm:px-5 md:flex-none", tab === k ? "bg-card text-foreground shadow-sm hover:bg-card" : "text-muted-foreground")}>{l}</Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {!ready ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
            : empty ? (
              <EmptyState icon={tab === "historico" ? History : CalendarCheck2}
                title={tab === "ativos" ? "Nada pendente por aqui" : tab === "concluidos" ? "Nenhum concluído ainda" : "Sem histórico"}
                text={tab === "ativos" ? "Adicione um compromisso para vê-lo aqui em ordem cronológica." : "Os compromissos aparecerão aqui com o tempo."}
                action={tab === "ativos" ? <Button className="h-11 rounded-xl" onClick={() => open("compromisso")}><Plus className="size-4" />Adicionar</Button> : undefined} />
            ) : list.filter((g) => g.items.length).map((g) => (
              <Section key={g.title} title={`${g.title} · ${g.items.length}`}>
                <div className="space-y-2.5">
                  {g.items.map(({ a }) => <AppointmentCard key={a.id} a={a} selected={!isMobile && selected === a.id} onSelect={() => setSelected(a.id)} />)}
                </div>
              </Section>
            ))}
        </div>

        <aside className="hidden lg:block">
          <div className="card-soft sticky top-8 p-6">
            {sel ? <AppointmentDetail a={sel} onDeleted={() => setSelected(null)} />
              : <div className="py-10 text-center text-sm text-muted-foreground">Selecione um compromisso para ver os detalhes.</div>}
          </div>
        </aside>
      </div>

      {/* Tablet/mobile: tela de detalhes própria */}
      <Sheet open={!!sel && typeof window !== "undefined" && window.innerWidth < 1024} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-6 pt-[calc(env(safe-area-inset-top)+3rem)] sm:max-w-md">
          <SheetHeader className="sr-only"><SheetTitle>Detalhes do compromisso</SheetTitle><SheetDescription>Ver, editar, concluir ou excluir</SheetDescription></SheetHeader>
          {sel && <AppointmentDetail a={sel} onDeleted={() => setSelected(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, cls, progress }: { icon: typeof Bed; label: string; value: string; sub: string; cls: string; progress?: number }) {
  return (
    <div className="card-soft p-3 md:p-4">
      <div className="flex items-center gap-2">
        <span className={cn("grid size-8 place-items-center rounded-lg", cls)}><Icon className="size-4" aria-hidden /></span>
        <span className="min-w-0 text-xs font-medium text-muted-foreground md:text-sm">{label}</span>
      </div>
      <p className="mt-2 font-display text-xl font-bold md:text-2xl">{value}</p>
      <p className="truncate text-xs text-muted-foreground">{sub}</p>
      {progress !== undefined && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-water transition-all" style={{ width: `${Math.min(100, progress * 100)}%` }} /></div>}
    </div>
  );
}
