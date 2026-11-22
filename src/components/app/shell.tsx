import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { BarChart3, CalendarDays, ListChecks, Plus, Settings, CalendarHeart } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAdd } from "./add-flow";
import { nowTime, parseISODate, toISODate, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { APPEARANCE_KEY, applyAppearance } from "@/lib/appearance";
import { appointmentNoticeKey } from "@/lib/calendar-math";

const NAV = [
  { to: "/", label: "Compromissos", icon: ListChecks },
  { to: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

/** Shorter labels for the cramped mobile tab bar; anything else uses its full label. */
const MOBILE_LABEL: Partial<Record<string, string>> = { Compromissos: "Agenda", Configurações: "Ajustes" };

export function AppShell({ children }: { children: ReactNode }) {
  const { open } = useAdd();
  const { data, ready, loadError, reload } = useStore();
  const path = useRouterState({ select: (s) => s.location.pathname });
  useReminderNotifications();
  const initials = (data.profile.name || "Você").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  useEffect(() => {
    if (!ready) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => applyAppearance(data.prefs, media.matches);
    apply();
    try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(data.prefs)); } catch { /* storage unavailable */ }
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [data.prefs, ready]);

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop / tablet sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col border-r bg-sidebar p-3 md:flex lg:w-64 lg:p-5">
        <Link to="/" className="mb-6 flex items-center gap-2.5 px-1">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><CalendarHeart className="size-5" aria-hidden /></span>
          <span className="hidden font-display text-xl font-bold lg:block">IAgenda</span>
        </Link>
        <Button disabled={!ready} onClick={() => open()} className="mb-5 h-11 rounded-xl shadow-[var(--shadow-fab)]" aria-label="Adicionar registro">
          <Plus className="size-5" /> <span className="hidden lg:inline">Adicionar</span>
        </Button>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Principal">
          {NAV.map((n) => {
            const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} title={n.label}
                className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <n.icon className="size-5 shrink-0" aria-hidden /><span className="hidden lg:inline">{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <Link to="/configuracoes" className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent font-semibold text-accent-foreground">{ready ? initials : ""}</span>
          <span className="hidden min-w-0 lg:block">
            <span className="block truncate text-sm font-semibold">{data.profile.name || "Seu perfil"}</span>
            <span className="block text-xs text-muted-foreground">Perfil e preferências</span>
          </span>
        </Link>
      </aside>

      <main className="app-content min-w-0 flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)] md:px-8 md:pb-10 md:pt-8 lg:px-12">
        <div className="mx-auto max-w-6xl">{loadError ? <div role="alert" className="space-y-4 py-10 text-center"><p className="font-semibold">Não foi possível carregar</p><Button className="h-11" onClick={reload}>Tentar de novo</Button></div> : ready ? children : <div aria-label="Carregando" className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />)}</div>}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav aria-label="Principal" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur md:hidden">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-1">
          {[NAV[0], NAV[1]].map((n) => <MobileTab key={n.to} {...n} path={path} />)}
          <div className="flex justify-center">
            <Button disabled={!ready} size="icon" onClick={() => open()} aria-label="Adicionar registro"
              className="-mt-7 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-fab)] transition active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40">
              <Plus className="size-7" aria-hidden />
            </Button>
          </div>
          {[NAV[2], NAV[3]].map((n) => <MobileTab key={n.to} {...n} path={path} />)}
        </div>
      </nav>
    </div>
  );
}

function MobileTab({ to, label, icon: Icon, path }: { to: (typeof NAV)[number]["to"]; label: string; icon: typeof Plus; path: string }) {
  const active = to === "/" ? path === "/" : path.startsWith(to);
  const short = MOBILE_LABEL[label] ?? label;
  return (
    <Link to={to} aria-label={label} aria-current={active ? "page" : undefined}
      className={cn("flex h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
      <Icon className="size-6" aria-hidden />{short}
    </Link>
  );
}

export function todayLabel() { return format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR }); }
export function dateLabel(iso: string, f = "d 'de' MMM") { return format(parseISODate(iso), f, { locale: ptBR }); }

const FIRED_KEY = "iagenda:notified";
function loadFired(): Set<string> { try { return new Set(JSON.parse(localStorage.getItem(FIRED_KEY) || "[]") as string[]); } catch { return new Set(); } }

/** Shows a system notification (via service worker when available, required on Android) plus an in-app toast. */
async function showNotice(title: string, body: string) {
  toast(title, { description: body, duration: 15000 });
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) { await reg.showNotification(title, { body, icon: "/icon-512.png" }); return; }
    new Notification(title, { body, icon: "/icon-512.png" });
  } catch { /* toast already shown */ }
}

/** Fires reminders for appointments, daily reminders and important days while the app is open. */
function useReminderNotifications() {
  const { data, ready } = useStore();
  const fired = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!ready || !data.prefs.notifications) return;
    fired.current ??= loadFired();
    const tick = () => {
      const set = fired.current; if (!set) return;
      const now = new Date(); const today = toISODate(now); const t = nowTime();
      const notify = (key: string, title: string, body: string) => {
        if (set.has(key)) return; set.add(key);
        try { localStorage.setItem(FIRED_KEY, JSON.stringify([...set].slice(-300))); } catch { /* ignore */ }
        void showNotice(title, body);
      };
      const due = (when: Date) => { const diff = now.getTime() - when.getTime(); return diff >= 0 && diff < 10 * 60_000; };
      data.reminders.filter((r) => r.active).forEach((r) => {
        const [h = 0, m = 0] = r.time.split(":").map(Number); const when = new Date(now); when.setHours(h, m, 0, 0);
        if (due(when)) notify(`r-${r.id}-${today}`, r.name, `Lembrete diário das ${r.time}`);
      });
      data.appointments.filter((a) => !a.done).forEach((a) => {
        const [h = 0, m = 0] = a.time.split(":").map(Number);
        const start = a.id.startsWith("wa-") ? new Date(`${a.date}T${a.time}:00-03:00`) : parseISODate(a.date);
        if (!a.id.startsWith("wa-")) start.setHours(h, m, 0, 0);
        if (a.reminder > 0) { const before = new Date(start.getTime() - a.reminder * 60_000); if (due(before)) notify(appointmentNoticeKey(a, true), a.title, `Começa às ${a.time} — ${dateLabel(a.date)}`); }
        if (due(start)) notify(appointmentNoticeKey(a), a.title, `Agora, às ${a.time}`);
      });
      if (t >= "08:00") data.importantDays.filter((d) => d.notify && d.date === today.slice(5)).forEach((d) => notify(`d-${d.id}-${today}`, "Dia importante hoje", d.name));
    };
    tick(); const id = setInterval(tick, 20_000); return () => clearInterval(id);
  }, [data, ready]);
}
