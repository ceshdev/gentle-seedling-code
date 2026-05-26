import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useAuth } from "@/lib/store";
import { AuthShell, Field } from "./login";

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Criar conta — AZk pods" }] }),
  component: SignupPage,
});

function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password.length < 4) {
      setErr("A senha deve ter ao menos 4 caracteres.");
      return;
    }
    try {
      signup(name.trim(), email, password);
      navigate({ to: "/" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao cadastrar");
    }
  };

  return (
    <AuthShell title="Criar conta" subtitle="É rápido e gratuito">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nome" value={name} onChange={setName} placeholder="Seu nome" />
        <Field label="E-mail" value={email} onChange={setEmail} type="email" placeholder="voce@email.com" />
        <Field label="Senha" value={password} onChange={setPassword} type="password" placeholder="mínimo 4 caracteres" />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <button className="w-full bg-secondary/60 hover:bg-secondary border border-border text-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2">
          <UserPlus className="w-4 h-4" /> Criar conta
        </button>
      </form>
      <p className="text-center text-xs text-muted-foreground mt-4">
        Já tem conta?{" "}
        <Link to="/login" className="text-brand-glow font-semibold">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
