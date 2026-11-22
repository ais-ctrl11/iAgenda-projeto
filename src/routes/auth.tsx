import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { CalendarHeart, LogIn, UserPlus, Mail, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/app/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — IAgenda" },
      { name: "description", content: "Entre na sua conta para acessar sua rotina." },
      { property: "og:title", content: "Entrar — IAgenda" },
      { property: "og:description", content: "Sua rotina segura na sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "entrar" | "criar" | "recuperar";

const TITLE: Record<Mode, string> = {
  entrar: "Entrar na sua conta",
  criar: "Criar conta",
  recuperar: "Recuperar senha",
};
const SUBMIT_LABEL: Record<Mode, string> = { entrar: "Entrar", criar: "Criar conta", recuperar: "Enviar link" };
const SUBMIT_ICON: Record<Mode, typeof LogIn> = { entrar: LogIn, criar: UserPlus, recuperar: Mail };

/** Turns a Supabase auth error into a friendly Portuguese message. Order of the checks matters. */
function authErrorMessage(err: unknown, mode: Mode) {
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  if (msg.includes("already registered") || msg.includes("already been registered")) return "Este e-mail já tem uma conta. Entre ou use “Esqueci minha senha”.";
  if (msg.includes("invalid login credentials")) return "E-mail ou senha incorretos. Se ainda não confirmou o cadastro, confira seu e-mail.";
  if (msg.includes("email not confirmed")) return "Confirme seu e-mail pelo link enviado antes de entrar.";
  if (msg.includes("weak") || msg.includes("easy to guess") || msg.includes("pwned")) return "Essa senha é muito comum ou já vazou em outros sites. Escolha uma senha mais forte, misturando letras, números e símbolos.";
  if (msg.includes("password")) return "A senha não atende aos requisitos. Use ao menos 6 caracteres.";
  return mode === "entrar" ? "Não foi possível entrar. Confira sua conexão e os dados da conta." : "Não foi possível concluir o cadastro. Confira os dados e tente novamente.";
}

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) void navigate({ to: "/", replace: true });
  }, [user, navigate]);

  const change = (m: Mode) => {
    setMode(m);
    setError("");
    setMessage("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "recuperar") {
        const r = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
        if (r.error) throw r.error;
        setMessage("Se houver uma conta para este e-mail, você receberá um link para redefinir a senha.");
      } else if (mode === "criar") {
        const r = await supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: window.location.origin } });
        if (r.error) throw r.error;
        setMessage("Confira seu e-mail para confirmar o cadastro antes de entrar.");
      } else {
        const r = await supabase.auth.signInWithPassword({ email, password });
        if (r.error) throw r.error;
        await navigate({ to: "/", replace: true });
      }
    } catch (err) {
      setError(authErrorMessage(err, mode));
    } finally {
      setBusy(false);
    }
  };

  const SubmitIcon = SUBMIT_ICON[mode];
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground"><CalendarHeart /></span>
          <span className="font-display text-3xl font-bold">IAgenda</span>
        </div>
        <h1 className="mb-6 font-display text-2xl font-semibold">{TITLE[mode]}</h1>
        <form className="space-y-4" onSubmit={submit}>
          {mode === "criar" && (
            <div className="space-y-2">
              <Label htmlFor="auth-name">Nome</Label>
              <Input id="auth-name" className="h-11 rounded-xl" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="auth-email">E-mail</Label>
            <Input id="auth-email" className="h-11 rounded-xl" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {mode !== "recuperar" && (
            <div className="space-y-2">
              <Label htmlFor="auth-password">Senha</Label>
              <Input id="auth-password" className="h-11 rounded-xl" type="password" minLength={6} autoComplete={mode === "criar" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="text-sm text-primary">{message}</p>}
          <Button disabled={busy} className="h-11 w-full rounded-xl">
            <SubmitIcon />
            {busy ? "Aguarde…" : SUBMIT_LABEL[mode]}
          </Button>
        </form>
        <div className="mt-4 flex flex-wrap justify-center gap-1">
          {mode === "entrar" ? (
            <>
              <Button variant="ghost" className="h-11" onClick={() => change("criar")}>Criar conta</Button>
              <Button variant="ghost" className="h-11" onClick={() => change("recuperar")}>Esqueci minha senha</Button>
            </>
          ) : (
            <Button variant="ghost" className="h-11" onClick={() => change("entrar")}><ArrowLeft />Voltar para entrar</Button>
          )}
        </div>
      </div>
    </main>
  );
}
