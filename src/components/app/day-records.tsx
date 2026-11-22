import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ENTRY_LABEL, appointmentStatus, recordsOn, useStore, type Entry } from "@/lib/store";
import { ENTRY_COLOR, ENTRY_ICON, HabitIcon, IconBubble, StatusBadge, AppointmentIcon } from "./shared";
import { useAdd } from "./add-flow";
import { dateLabel } from "./shell";

function entryValueLabel(e: Entry) {
  if (e.value === undefined) return "";
  const text = e.type === "sono" ? `${e.value}h` : e.type === "agua" ? `${e.value} copo(s)` : e.type === "exercicio" ? `${Math.floor(e.value / 60)}h ${e.value % 60}min` : e.value;
  return ` · ${text}`;
}

export function DayRecords({ date, showHeader = true }: { date: string; showHeader?: boolean }) {
  const { data, removeEntry, removeHabit } = useStore();
  const { open } = useAdd();
  const r = recordsOn(data, date);
  const total = r.appointments.length + r.entries.length + r.habits.length;
  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-display text-lg font-semibold capitalize">{dateLabel(date, "EEEE, d 'de' MMMM")}</p>
            <p className="text-sm text-muted-foreground">{total} {total === 1 ? "registro" : "registros"}</p>
          </div>
          <Button size="icon" variant="outline" className="size-11 rounded-xl" aria-label="Adicionar neste dia" onClick={() => open("menu", { date })}><Plus className="size-5" /></Button>
        </div>
      )}
      {total === 0 && <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum registro neste dia.</p>}
      <ul className="space-y-2">
        {r.appointments.map((a) => (
          <li key={a.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
            <IconBubble icon={AppointmentIcon} className="bg-future/15 text-future" />
            <div className="min-w-0 flex-1"><p className="truncate font-medium">{a.title}</p><p className="text-sm text-muted-foreground">{a.time} · compromisso</p></div>
            <StatusBadge status={appointmentStatus(a)} />
          </li>
        ))}
        {r.entries.map((e) => (
          <li key={e.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
            <IconBubble icon={ENTRY_ICON[e.type]} className={ENTRY_COLOR[e.type]} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{ENTRY_LABEL[e.type]}{entryValueLabel(e)}{e.quality && ` · ${e.quality}`}</p>
              <p className="truncate text-sm text-muted-foreground">{e.time}{e.note && ` · ${e.note}`}</p>
            </div>
            <Button size="icon" variant="ghost" className="size-11 rounded-xl text-muted-foreground" aria-label="Excluir registro" onClick={() => { removeEntry(e.id); toast.success("Registro excluído"); }}><Trash2 className="size-4" /></Button>
          </li>
        ))}
        {r.habits.map((h) => (
          <li key={h.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
            <IconBubble icon={HabitIcon} className="bg-habit/15 text-habit" />
            <div className="min-w-0 flex-1"><p className="truncate font-medium">{h.name}</p><p className="truncate text-sm text-muted-foreground">{h.time} · hábito {h.kind}{h.note && ` · ${h.note}`}</p></div>
            <Button size="icon" variant="ghost" className="size-11 rounded-xl text-muted-foreground" aria-label="Excluir hábito" onClick={() => { removeHabit(h.id); toast.success("Hábito excluído"); }}><Trash2 className="size-4" /></Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
