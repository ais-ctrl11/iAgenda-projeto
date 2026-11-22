import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarClock, Repeat, Sparkles, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { CATEGORY_LABEL, ENTRY_LABEL, nowTime, toISODate, useStore, type Appointment, type Category, type EntryType } from "@/lib/store";
import { ENTRY_ICON, ENTRY_COLOR, Field } from "./shared";
import { cn } from "@/lib/utils";
import { dateTimeSchema } from "@/lib/backup";

type Kind = "menu" | "compromisso" | "acontecimento" | "habito";
interface AddCtx { open: (k?: Kind, opts?: { date?: string; edit?: Appointment }) => void }
const Ctx = createContext<AddCtx>({ open: () => {} });
export const useAdd = () => useContext(Ctx);

const selectCls = "h-11 w-full rounded-xl border border-input bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AddFlowProvider({ children }: { children: ReactNode }) {
  const { ready } = useStore();
  const [state, setState] = useState<{ open: boolean; kind: Kind; date?: string | undefined; edit?: Appointment | undefined }>({ open: false, kind: "menu" });
  const isMobile = useIsMobile();
  const close = () => setState((s) => ({ ...s, open: false }));
  // Stable between renders so consumers of useAdd() don't re-render on every store change.
  const ctx = useMemo<AddCtx>(() => ({ open: (k = "menu", o) => { if (ready) setState({ open: true, kind: k, date: o?.date, edit: o?.edit }); } }), [ready]);

  const titles: Record<Kind, [string, string]> = {
    menu: ["O que você quer registrar?", "Escolha uma ação rápida."],
    compromisso: [state.edit ? "Editar compromisso" : "Novo compromisso", "Algo que ainda vai acontecer."],
    acontecimento: ["Registrar acontecimento", "Algo que já aconteceu: sono, refeição, exercício…"],
    habito: ["Registrar hábito ou rotina", "Atividades recorrentes ou pontuais."],
  };
  const body = (
    <div className="space-y-4">
      {state.kind !== "menu" && !state.edit && (
        <Button variant="ghost" size="sm" className="-ml-2 h-11" onClick={() => setState((s) => ({ ...s, kind: "menu" }))}>
          <ChevronLeft className="size-4" /> Voltar
        </Button>
      )}
      {state.kind === "menu" && <Menu onPick={(k) => setState((s) => ({ ...s, kind: k }))} />}
      {state.kind === "compromisso" && <AppointmentForm date={state.date} edit={state.edit} onDone={close} />}
      {state.kind === "acontecimento" && <EntryForm date={state.date} onDone={close} />}
      {state.kind === "habito" && <HabitForm date={state.date} onDone={close} />}
    </div>
  );

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {isMobile ? (
        <Sheet open={state.open} onOpenChange={(o) => !o && close()}>
          <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
            <div className="mx-auto mb-1 h-1.5 w-12 rounded-full bg-muted" aria-hidden />
            <SheetHeader className="px-0 text-left">
              <SheetTitle className="font-display text-xl">{titles[state.kind][0]}</SheetTitle>
              <SheetDescription>{titles[state.kind][1]}</SheetDescription>
            </SheetHeader>
            {body}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={state.open} onOpenChange={(o) => !o && close()}>
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">{titles[state.kind][0]}</DialogTitle>
              <DialogDescription>{titles[state.kind][1]}</DialogDescription>
            </DialogHeader>
            {body}
          </DialogContent>
        </Dialog>
      )}
    </Ctx.Provider>
  );
}

function Menu({ onPick }: { onPick: (k: Kind) => void }) {
  const items = [
    { k: "compromisso" as const, icon: CalendarClock, t: "Compromisso", d: "Futuro: data, hora e lembrete", c: "bg-future/15 text-future" },
    { k: "acontecimento" as const, icon: Sparkles, t: "Acontecimento", d: "Já aconteceu: sono, comida, água…", c: "bg-food/15 text-food" },
    { k: "habito" as const, icon: Repeat, t: "Hábito ou rotina", d: "Marque o que você fez hoje", c: "bg-habit/15 text-habit" },
  ];
  return (
    <div className="grid gap-3">
      {items.map((i) => (
        <button key={i.k} onClick={() => onPick(i.k)} className="flex min-h-16 items-center gap-4 rounded-2xl border bg-card p-4 text-left transition hover:border-primary hover:bg-primary-soft/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className={cn("grid size-12 place-items-center rounded-xl", i.c)}><i.icon className="size-6" aria-hidden /></span>
          <span><span className="block font-semibold">{i.t}</span><span className="text-sm text-muted-foreground">{i.d}</span></span>
        </button>
      ))}
    </div>
  );
}

function AppointmentForm({ date, edit, onDone }: { date?: string | undefined; edit?: Appointment | undefined; onDone: () => void }) {
  const { addAppointment, updateAppointment } = useStore();
  const [f, setF] = useState({
    title: edit?.title ?? "", date: edit?.date ?? date ?? toISODate(new Date()), time: edit?.time ?? "09:00",
    description: edit?.description ?? "", category: (edit?.category ?? "pessoal") as Category, reminder: edit?.reminder ?? 15,
  });
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      if (!f.title.trim()) { toast.error("Dê um título ao compromisso."); return; }
      if (edit) { updateAppointment(edit.id, f); toast.success("Compromisso atualizado"); }
      else { addAppointment(f); toast.success("Compromisso adicionado"); }
      onDone();
    }}>
      <Field id="ap-title" label="Título"><Input id="ap-title" className="h-11 rounded-xl" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex.: Consulta no dentista" autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="ap-date" label="Data"><Input id="ap-date" type="date" className="h-11 rounded-xl" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required /></Field>
        <Field id="ap-time" label="Horário"><Input id="ap-time" type="time" className="h-11 rounded-xl" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} required /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field id="ap-cat" label="Categoria">
          <select id="ap-cat" className={selectCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as Category })}>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field id="ap-rem" label="Lembrete">
          <select id="ap-rem" className={selectCls} value={f.reminder} onChange={(e) => setF({ ...f, reminder: Number(e.target.value) })}>
            <option value={0}>Sem lembrete</option><option value={5}>5 min antes</option><option value={15}>15 min antes</option>
            <option value={60}>1 hora antes</option><option value={1440}>1 dia antes</option>
          </select>
        </Field>
      </div>
      <Field id="ap-desc" label="Descrição"><Textarea id="ap-desc" className="rounded-xl" rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Opcional" /></Field>
      <Button type="submit" className="h-12 w-full rounded-xl text-base">{edit ? "Salvar alterações" : "Adicionar compromisso"}</Button>
    </form>
  );
}

function EntryForm({ date, onDone }: { date?: string | undefined; onDone: () => void }) {
  const { addEntry } = useStore();
  const today = toISODate(new Date());
  const [type, setType] = useState<EntryType>("agua");
  const [f, setF] = useState({ date: date && date <= today ? date : today, time: nowTime(), wake: "07:00", note: "", value: "1", hours: "0", minutes: "30", quality: "ok" as "ruim" | "ok" | "boa" });
  useEffect(() => { setF((x) => ({ ...x, value: type === "agua" ? "1" : "" })); }, [type]);
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      if (f.date > today) { toast.error("Acontecimentos são do passado. Para o futuro, crie um compromisso."); return; }
      if (!dateTimeSchema.safeParse(f).success || (type === "sono" && !dateTimeSchema.safeParse({ date: f.date, time: f.wake }).success)) { toast.error("Preencha a data e os horários."); return; }
      let value = f.value ? Number(f.value) : undefined;
      if (type === "sono") { const [sh = 0, sm = 0] = f.time.split(":").map(Number); const [wh = 0, wm = 0] = f.wake.split(":").map(Number); let minutes = wh * 60 + wm - (sh * 60 + sm); if (minutes <= 0) minutes += 24 * 60; value = Math.round((minutes / 60) * 100) / 100; }
      if (type === "exercicio") value = Number(f.hours) * 60 + Number(f.minutes);
      if (!addEntry({ type, date: f.date, time: f.time, note: f.note, value, quality: type === "sono" || type === "alimentacao" ? f.quality : undefined })) return;
      toast.success(`${ENTRY_LABEL[type]} registrado`);
      onDone();
    }}>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Tipo</legend>
        <div className="grid grid-cols-5 gap-2">
          {(Object.keys(ENTRY_LABEL) as EntryType[]).map((t) => {
            const Icon = ENTRY_ICON[t];
            return (
              <button type="button" key={t} aria-pressed={type === t} onClick={() => setType(t)}
                className={cn("flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", type === t ? "border-primary bg-primary-soft" : "bg-card")}>
                <span className={cn("grid size-8 place-items-center rounded-lg", ENTRY_COLOR[t])}><Icon className="size-4" aria-hidden /></span>
                {ENTRY_LABEL[t]}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field id="en-date" label="Data"><Input required id="en-date" type="date" max={today} className="h-11 rounded-xl" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field id="en-time" label={type === "sono" ? "Hora que dormiu" : "Horário"}><Input required id="en-time" type="time" className="h-11 rounded-xl" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
      </div>
      {type === "agua" && <Field id="en-val" label="Copos (250 ml)"><Input id="en-val" type="number" inputMode="decimal" min={0} step={1} className="h-11 rounded-xl" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>}
      {type === "sono" && <Field id="en-wake" label="Horário em que acordou"><Input required id="en-wake" type="time" className="h-11 rounded-xl" value={f.wake} onChange={(e) => setF({ ...f, wake: e.target.value })} /></Field>}
      {type === "exercicio" && <div className="grid grid-cols-2 gap-3"><Field id="en-hours" label="Duração (horas)"><Input id="en-hours" type="number" min={0} max={24} className="h-11 rounded-xl" value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} /></Field><Field id="en-minutes" label="Minutos"><Input id="en-minutes" type="number" min={0} max={59} className="h-11 rounded-xl" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /></Field></div>}
      {(type === "sono" || type === "alimentacao") && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{type === "sono" ? "Qualidade do sono" : "Como foi a refeição"}</legend>
          <div className="grid grid-cols-3 gap-2">
            {(["ruim", "ok", "boa"] as const).map((q) => (
              <button type="button" key={q} aria-pressed={f.quality === q} onClick={() => setF({ ...f, quality: q })}
                className={cn("h-11 rounded-xl border text-sm font-medium capitalize", f.quality === q ? "border-primary bg-primary-soft" : "bg-card")}>{q === "ok" ? "Ok" : q}</button>
            ))}
          </div>
        </fieldset>
      )}
      <Field id="en-note" label="Observação"><Textarea id="en-note" className="rounded-xl" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder={type === "sono" ? "Ex.: acordei várias vezes" : "Opcional"} /></Field>
      <Button type="submit" className="h-12 w-full rounded-xl text-base">Registrar</Button>
    </form>
  );
}

const HABIT_SUGGESTIONS = ["Meditar", "Ler", "Estudar", "Tomar remédio", "Caminhar", "Skincare"];
function HabitForm({ date, onDone }: { date?: string | undefined; onDone: () => void }) {
  const { addHabit, data } = useStore();
  const known = Array.from(new Set([...data.habits.map((h) => h.name), ...HABIT_SUGGESTIONS])).slice(0, 8);
  const [f, setF] = useState({ name: "", kind: "recorrente" as "recorrente" | "pontual", date: date ?? toISODate(new Date()), time: nowTime(), note: "" });
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      if (!f.name.trim()) { toast.error("Informe o nome do hábito."); return; }
      if (!dateTimeSchema.safeParse(f).success) { toast.error("Preencha a data e o horário."); return; }
      if (!addHabit({ ...f, name: f.name.trim() })) return; toast.success("Hábito registrado"); onDone();
    }}>
      <Field id="hb-name" label="Hábito"><Input id="hb-name" className="h-11 rounded-xl" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Meditar" /></Field>
      <div className="flex flex-wrap gap-2" aria-label="Sugestões">
        {known.map((n) => <button type="button" key={n} onClick={() => setF({ ...f, name: n })} className={cn("min-h-11 rounded-full border px-4 text-sm", f.name === n ? "border-primary bg-primary-soft" : "bg-card")}>{n}</button>)}
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Frequência</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["recorrente", "pontual"] as const).map((k) => <button type="button" key={k} aria-pressed={f.kind === k} onClick={() => setF({ ...f, kind: k })} className={cn("h-11 rounded-xl border text-sm font-medium capitalize", f.kind === k ? "border-primary bg-primary-soft" : "bg-card")}>{k}</button>)}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field id="hb-date" label="Data"><Input required id="hb-date" type="date" className="h-11 rounded-xl" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field id="hb-time" label="Horário"><Input required id="hb-time" type="time" className="h-11 rounded-xl" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
      </div>
      <Field id="hb-note" label="Observação"><Textarea id="hb-note" className="rounded-xl" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Opcional" /></Field>
      <Button type="submit" className="h-12 w-full rounded-xl text-base">Registrar hábito</Button>
    </form>
  );
}
