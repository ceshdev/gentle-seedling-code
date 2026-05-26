import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bike, Check } from "lucide-react";
import { useCouriers } from "@/lib/store";
import { AuthShell, Field } from "./login";

export const Route = createFileRoute("/entregadores")({
  head: () => ({ meta: [{ title: "Cadastro de entregadores — AZk pods" }] }),
  component: CourierSignup,
});

function CourierSignup() {
  const { add } = useCouriers();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pix, setPix] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    add({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      pix: pix.trim(),
      password,
    });
    setDone(true);
    setName(""); setPhone(""); setEmail(""); setPix(""); setPassword("");
  };

  return (
    <AuthShell title="Seja entregador" subtitle="Cadastre-se para receber corridas da AZk pods">
      {done ? (
        <div className="text-center py-6">
          <div className="w-14 h-14 rounded-full bg-primary mx-auto flex items-center justify-center mb-3">
            <Check className="w-7 h-7 text-primary-foreground" />
          </div>
          <p className="font-bold">Cadastro recebido!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Após a aprovação, entre com seu e-mail e senha em{" "}
            <Link to="/login" className="text-brand-glow font-semibold">Entrar</Link>{" "}
            para ver os pedidos.
          </p>
          <button
            onClick={() => setDone(false)}
            className="mt-4 text-xs text-brand-glow font-semibold"
          >
            Cadastrar outro
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Field label="Nome completo" value={name} onChange={setName} placeholder="João da Silva" />
          <Field label="Telefone" value={phone} onChange={setPhone} placeholder="(62) 9 9999-9999" />
          <Field label="E-mail" value={email} onChange={setEmail} type="email" placeholder="voce@email.com" />
          <Field label="Senha de acesso" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
          <Field label="Chave PIX (recebimento)" value={pix} onChange={setPix} placeholder="CPF, telefone, e-mail ou chave aleatória" />
          <button className="w-full bg-secondary/60 hover:bg-secondary border border-border text-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2">
            <Bike className="w-4 h-4" /> Enviar cadastro
          </button>
        </form>
      )}
      <p className="text-center text-xs text-muted-foreground mt-4">
        <Link to="/" className="text-brand-glow">Voltar à loja</Link>
      </p>
    </AuthShell>
  );
}
