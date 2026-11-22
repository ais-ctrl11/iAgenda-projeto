import { Apple, Bed, Droplets, Dumbbell, Sparkles, Repeat, CalendarClock, type LucideIcon } from "lucide-react";
import { STATUS_LABEL, type AppointmentStatus, type EntryType } from "@/lib/store";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const ENTRY_ICON: Record<EntryType, LucideIcon> = {
  sono: Bed, alimentacao: Apple, exercicio: Dumbbell, agua: Droplets, outro: Sparkles,
};
export const ENTRY_COLOR: Record<EntryType, string> = {
  sono: "bg-sleep/15 text-sleep", alimentacao: "bg-food/15 text-food", exercicio: "bg-exercise/15 text-exercise",
  agua: "bg-water/15 text-water", outro: "bg-other/15 text-other",
};
export const ENTRY_FILL: Record<EntryType, string> = {
  sono: "fill-sleep", alimentacao: "fill-food", exercicio: "fill-exercise", agua: "fill-water", outro: "fill-other",
};
export const HabitIcon = Repeat;
export const AppointmentIcon = CalendarClock;

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  futuro: "bg-future/15 text-future-foreground", concluido: "bg-done/15 text-done",
  atrasado: "bg-late/15 text-late", expirado: "bg-expired/15 text-expired",
};
export const STATUS_BAR: Record<AppointmentStatus, string> = {
  futuro: "bg-future", concluido: "bg-done", atrasado: "bg-late", expirado: "bg-expired",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>;
}

export function IconBubble({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", className)}><Icon className="size-5" aria-hidden /></span>;
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card-soft fade-up flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary"><Icon className="size-7" aria-hidden /></span>
      <p className="mt-1 font-display text-lg font-semibold">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string | undefined; actions?: ReactNode }) {
  return (
    <header className="page-header mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {subtitle && <p className="text-sm text-muted-foreground first-letter:uppercase">{subtitle}</p>}
        <h1 className="break-words font-display text-2xl font-bold lg:text-3xl">{title}</h1>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Section({ title, children, right, className }: { title: string; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-secondary-foreground">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export const ENTRY_DOT: Record<EntryType, string> = {
  sono: "bg-sleep", alimentacao: "bg-food", exercicio: "bg-exercise", agua: "bg-water", outro: "bg-other",
};
