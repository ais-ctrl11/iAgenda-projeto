import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — IAgenda" },
      { name: "description", content: "Defina uma nova senha para sua conta IAgenda." },
      { property: "og:title", content: "Redefinir senha — IAgenda" },
      { property: "og:description", content: "Recupere o acesso à sua rotina." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery") setValid(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setValid(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError("O link expirou ou a senha não foi aceita. Solicite outro link.");
      return;
    }
    await navigate({ to: "/", replace: true });
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 font-display text-2xl font-bold">Redefinir senha</h1>
        {valid ? (
          <form className="space-y-4" onSubmit={submit}>
            <Label htmlFor="new-password">Nova senha</Label>
            <Input id="new-password" className="h-11" type="password" minLength={6} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <Input id="confirm-password" className="h-11" type="password" minLength={6} autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button className="h-11 w-full" disabled={busy}>{busy ? "Salvando…" : "Salvar nova senha"}</Button>
          </form>
        ) : (
          <p className="mb-4 text-muted-foreground">Abra o link de recuperação enviado ao seu e-mail.</p>
        )}
        <Button asChild variant="ghost" className="mt-4 h-11"><Link to="/auth">Voltar para entrar</Link></Button>
      </div>
    </main>
  );
}
