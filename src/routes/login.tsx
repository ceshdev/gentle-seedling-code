import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LogIn, Zap, Bike } from "lucide-react";
import { ADMIN_EMAIL, useAuth } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — AZk pods" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const u = await login(email, password);
      if (u.role === "admin") navigate({ to: "/admin" });
      else if (u.role === "courier") navigate({ to: "/entregador" });
      else navigate({ to: "/" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao entrar");
    }
  };

  return (
    <AuthShell title="Entrar" subtitle="Acesse sua conta AZk pods">
      <form onSubmit={submit} className="space-y-3">
        <Field label="E-mail" value={email} onChange={setEmail} type="email" placeholder="voce@email.com" />
        <Field label="Senha" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <button className="w-full bg-secondary/60 hover:bg-secondary border border-border text-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2">
          <LogIn className="w-4 h-4" /> Entrar
        </button>
      </form>
      <p className="text-center text-xs text-muted-foreground mt-4">
        Não tem conta?{" "}
        <Link to="/cadastro" className="text-brand-glow font-semibold">
          Cadastre-se
        </Link>
      </p>
      <div className="mt-4 pt-4 border-t border-border/60">
        <Link
          to="/entregadores"
          className="w-full inline-flex items-center justify-center gap-2 bg-secondary/60 hover:bg-secondary border border-border rounded-xl py-2.5 text-xs font-semibold text-foreground"
        >
          <Bike className="w-4 h-4" /> Quero ser entregador
        </Link>
      </div>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-primary/20 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 w-[380px] h-[380px] rounded-full bg-brand-glow/15 blur-[120px]" />
      <div className="relative w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[var(--gradient-brand)] flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">AZk<span className="text-brand-glow">pods</span></span>
        </Link>
        <div className="bg-[var(--gradient-surface)] border border-border/70 rounded-2xl p-6 shadow-[var(--shadow-card)]">
          <h1 className="font-bold text-2xl">{title}</h1>
          <p className="text-sm text-muted-foreground mb-5">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
      />
    </label>
  );
}
