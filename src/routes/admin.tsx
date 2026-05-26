import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Shield, Trash2, Bike, Check, Clock, MessageCircle, Send, Star, AlertTriangle, CheckCircle2, KeyRound, Eye, EyeOff, Banknote, PackagePlus } from "lucide-react";
import { useAuth, useCouriers, useOrders, useAdminCredentials, useWithdrawals, useProducts, type Order, type Product } from "@/lib/store";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Painel admin — AZk pods" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, hydrated, user } = useAuth();
  const { couriers, approve, remove } = useCouriers();
  const { orders, addMessage, releaseFee } = useOrders();
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && !isAdmin) navigate({ to: "/login" });
  }, [hydrated, isAdmin, navigate]);

  if (!hydrated || !isAdmin) return null;

  const pending = couriers.filter((c) => !c.approved);
  const approved = couriers.filter((c) => c.approved);

  return (
    <div className="min-h-screen pb-16 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-primary/20 blur-[120px]" />

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border/60">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4" /> Loja
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-glow" />
            <span className="text-sm font-semibold">Admin</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 relative space-y-6">
        <section className="bg-[var(--gradient-surface)] border border-border/70 rounded-2xl p-5 shadow-[var(--shadow-card)]">
          <p className="text-xs text-muted-foreground">Logado como</p>
          <p className="font-bold">{user?.email}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <Link
              to="/"
              className="bg-secondary/60 border border-border/60 rounded-xl py-3 text-sm font-semibold hover:bg-accent"
            >
              Gerenciar produtos
            </Link>
            <Link
              to="/entregadores"
              className="bg-secondary/60 border border-border/60 rounded-xl py-3 text-sm font-semibold hover:bg-accent"
            >
              Página de cadastro
            </Link>
          </div>
        </section>

        <AdminCredentialsCard />

        <FlavorStockSection />

        <WithdrawalsSection />

        <ProblemsSection
          orders={orders.filter((o) => o.problem && !o.problem.resolvedAt)}
          onSend={(id, text) => addMessage(id, "admin", text)}
          onRelease={(id, resolution) => releaseFee(id, resolution)}
        />




        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-glow" /> Aguardando aprovação
            </h2>
            <span className="text-xs text-muted-foreground">{pending.length}</span>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-secondary/40 border border-border/60 rounded-xl p-6 text-center">
              Nenhum entregador pendente.
            </p>
          ) : (
            <ul className="space-y-2">
              {pending.map((c) => (
                <li
                  key={c.id}
                  className="bg-[var(--gradient-surface)] border border-border/70 rounded-xl p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.phone} · {c.email}</p>
                    <p className="text-[11px] mt-1">
                      PIX: <span className="text-brand-glow font-mono break-all">{c.pix}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => approve(c.id)}
                      className="bg-secondary/60 hover:bg-secondary border border-border text-foreground rounded-lg px-2 py-1 text-xs font-bold flex items-center gap-1"
                      aria-label="Aprovar"
                    >
                      <Check className="w-3 h-3" /> Aprovar
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      aria-label="Recusar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Bike className="w-5 h-5 text-brand-glow" /> Aprovados
            </h2>
            <span className="text-xs text-muted-foreground">{approved.length}</span>
          </div>
          {approved.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-secondary/40 border border-border/60 rounded-xl p-6 text-center">
              Nenhum entregador aprovado ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {approved.map((c) => (
                <li
                  key={c.id}
                  className="bg-[var(--gradient-surface)] border border-border/70 rounded-xl p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate flex items-center gap-1">
                      {c.name}
                      <Check className="w-3 h-3 text-brand-glow" />
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{c.phone} · {c.email}</p>
                    <p className="text-[11px] mt-1">
                      PIX: <span className="text-brand-glow font-mono break-all">{c.pix}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => remove(c.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    aria-label="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-brand-glow" /> Pedidos & atendimento
            </h2>
            <span className="text-xs text-muted-foreground">{orders.length}</span>
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-secondary/40 border border-border/60 rounded-xl p-6 text-center">
              Nenhum pedido ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {orders.map((o) => (
                <AdminOrderCard
                  key={o.id}
                  order={o}
                  onSend={(text) => addMessage(o.id, "admin", text)}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function AdminOrderCard({
  order,
  onSend,
}: {
  order: Order;
  onSend: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const send = () => {
    const t = msg.trim();
    if (!t) return;
    onSend(t);
    setMsg("");
  };

  const statusBadge =
    order.status === "pending" ? "Aguardando" : order.status === "accepted" ? "A caminho" : "Entregue";

  return (
    <li className="bg-[var(--gradient-surface)] border border-border/70 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full p-3 flex items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">
            #{order.id.slice(-6)} · {order.customerName}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">{order.address}</p>
          <div className="flex items-center gap-2 mt-1 text-[10px]">
            <span className="bg-secondary px-1.5 py-0.5 rounded">{statusBadge}</span>
            {order.deliveryConfirmed === true && (
              <span className="text-emerald-400 flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> Sucesso
              </span>
            )}
            {order.deliveryConfirmed === false && (
              <span className="text-destructive flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> Problema
              </span>
            )}
            {order.rating ? (
              <span className="text-amber-400 flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-amber-400" /> {order.rating}/5
              </span>
            ) : null}
            {order.messages?.length ? (
              <span className="text-brand-glow flex items-center gap-0.5">
                <MessageCircle className="w-3 h-3" /> {order.messages.length}
              </span>
            ) : null}
          </div>
        </div>
        <span className="text-sm font-bold text-brand-glow whitespace-nowrap">
          R$ {order.total.toFixed(2)}
        </span>
      </button>

      {open && (
        <div className="border-t border-border/60 p-3 space-y-2">
          {order.ratingComment && (
            <p className="text-[11px] italic text-muted-foreground border-l-2 border-amber-400 pl-2">
              "{order.ratingComment}"
            </p>
          )}
          <div className="bg-secondary/40 border border-border/60 rounded-lg p-2 max-h-48 overflow-y-auto space-y-1.5">
            {(order.messages ?? []).length === 0 && (
              <p className="text-center text-[11px] text-muted-foreground py-6">
                Sem mensagens.
              </p>
            )}
            {(order.messages ?? []).map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs ${
                  m.from === "admin"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-background border border-border"
                }`}
              >
                <p className="text-[9px] opacity-70 uppercase tracking-wide mb-0.5">
                  {m.from === "admin" ? "Você" : order.customerName}
                </p>
                {m.text}
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Responder ao cliente"
              className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-sm"
            />
            <button
              onClick={send}
              className="bg-secondary/60 hover:bg-secondary border border-border text-foreground px-3 rounded-md flex items-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function AdminCredentialsCard() {
  const { creds, update } = useAdminCredentials();
  const [email, setEmail] = useState(creds.email);
  const [password, setPassword] = useState(creds.password);
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setEmail(creds.email);
    setPassword(creds.password);
  }, [creds.email, creds.password]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !password) return;
    update({ email: cleanEmail, password });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const dirty = email.toLowerCase().trim() !== creds.email || password !== creds.password;

  return (
    <section className="bg-[var(--gradient-surface)] border border-border/70 rounded-2xl p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 mb-3">
        <KeyRound className="w-4 h-4 text-brand-glow" />
        <h2 className="font-bold text-sm">Credenciais do admin</h2>
      </div>
      <form onSubmit={save} className="space-y-3">
        <label className="block">
          <span className="text-xs text-muted-foreground">E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
            required
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted-foreground">Senha</span>
          <div className="mt-1 relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm pr-10"
              required
              minLength={3}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={show ? "Ocultar senha" : "Mostrar senha"}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </label>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            Salvas neste dispositivo. Use no próximo login.
          </p>
          <button
            disabled={!dirty}
            className="bg-secondary/60 hover:bg-secondary border border-border text-foreground rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50"
          >
            {saved ? "Salvo!" : "Salvar"}
          </button>
        </div>
      </form>
    </section>
  );
}

function WithdrawalsSection() {
  const { withdrawals, update } = useWithdrawals();
  const pendingTotal = withdrawals
    .filter((w) => w.status === "pending")
    .reduce((s, w) => s + w.amount, 0);
  return (
    <section className="bg-[var(--gradient-surface)] border border-border/70 rounded-2xl p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <Banknote className="w-4 h-4 text-brand-glow" /> Saques dos entregadores
        </h2>
        <span className="text-xs text-muted-foreground">
          {withdrawals.length} · pendente R$ {pendingTotal.toFixed(2)}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">
        O entregador solicita o saque pelo painel dele. Envie o PIX manualmente para a chave abaixo e marque como pago.
      </p>
      {withdrawals.length === 0 ? (
        <p className="text-xs text-muted-foreground bg-secondary/40 border border-border/60 rounded-lg p-4 text-center">
          Nenhum saque ainda.
        </p>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto">
          {withdrawals.map((w) => (
            <li key={w.id} className="bg-background/40 border border-border/60 rounded-lg p-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{w.courierName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{w.courierEmail}</p>
                  <p className="text-[10px] mt-0.5">
                    PIX <span className="text-brand-glow font-mono">{w.pix}</span>{" "}
                    <span className="text-muted-foreground">({w.pixType})</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(w.createdAt).toLocaleString("pt-BR")} · {w.orderIds.length} pedido(s)
                  </p>
                  {w.error && <p className="text-[10px] text-destructive mt-1">Erro: {w.error}</p>}
                  {w.receiptUrl && (
                    <a
                      href={w.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-brand-glow underline"
                    >
                      Ver comprovante
                    </a>
                  )}
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="font-bold text-brand-glow">R$ {w.amount.toFixed(2)}</p>
                  <span
                    className={`text-[10px] font-semibold ${
                      w.status === "paid"
                        ? "text-emerald-400"
                        : w.status === "failed"
                          ? "text-destructive"
                          : "text-amber-400"
                    }`}
                  >
                    {w.status === "paid" ? "Pago" : w.status === "failed" ? "Falhou" : "Pendente"}
                  </span>
                  {w.status === "pending" && (
                    <button
                      onClick={() => {
                        if (confirm(`Confirmar envio de R$ ${w.amount.toFixed(2)} via PIX para ${w.pix}?`)) {
                          update(w.id, { status: "paid" });
                        }
                      }}
                      className="bg-primary text-primary-foreground rounded-md px-2 py-1 text-[10px] font-bold"
                    >
                      Marcar como pago
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProblemsSection({
  orders,
  onSend,
  onRelease,
}: {
  orders: Order[];
  onSend: (id: string, text: string) => void;
  onRelease: (id: string, resolution?: string) => void;
}) {
  return (
    <section className="bg-[var(--gradient-surface)] border border-amber-500/40 rounded-2xl p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" /> Problemas reportados
        </h2>
        <span className="text-xs text-muted-foreground">{orders.length}</span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">
        Esses pedidos tiveram a taxa do entregador bloqueada. Converse e libere quando esclarecer.
      </p>
      {orders.length === 0 ? (
        <p className="text-xs text-muted-foreground bg-secondary/40 border border-border/60 rounded-lg p-4 text-center">
          Nenhum problema em aberto.
        </p>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <ProblemRow
              key={o.id}
              order={o}
              onSend={(t) => onSend(o.id, t)}
              onRelease={(r) => onRelease(o.id, r)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ProblemRow({
  order,
  onSend,
  onRelease,
}: {
  order: Order;
  onSend: (text: string) => void;
  onRelease: (resolution?: string) => void;
}) {
  const [msg, setMsg] = useState("");
  const send = () => {
    const t = msg.trim();
    if (!t) return;
    onSend(t);
    setMsg("");
  };
  const release = () => {
    const r = prompt("Mensagem de liberação para o entregador (opcional):")?.trim();
    if (confirm(`Liberar R$ ${order.deliveryFee.toFixed(2)} para ${order.courierEmail}?`)) {
      onRelease(r || undefined);
    }
  };
  const messages = order.messages ?? [];

  return (
    <li className="bg-background/40 border border-border/60 rounded-lg p-2.5 space-y-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">
            #{order.id.slice(-6)} · {order.customerName}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            Entregador: {order.courierEmail}
          </p>
          <p className="text-[10px] text-amber-300 mt-0.5">
            ⚠️ {order.problem?.reason}
          </p>
        </div>
        <p className="font-bold text-brand-glow whitespace-nowrap">
          R$ {order.deliveryFee.toFixed(2)}
        </p>
      </div>

      <div className="bg-secondary/40 border border-border/60 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1.5">
        {messages.length === 0 && (
          <p className="text-center text-[11px] text-muted-foreground py-3">
            Sem mensagens.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs ${
              m.from === "admin"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-background border border-border"
            }`}
          >
            <p className="text-[9px] opacity-70 uppercase tracking-wide mb-0.5">
              {m.from === "admin" ? "Você" : m.from === "courier" ? "Entregador" : "Cliente"}
            </p>
            {m.text}
          </div>
        ))}
      </div>

      <div className="flex gap-1.5">
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Responder ao entregador"
          className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-xs"
        />
        <button
          onClick={send}
          className="bg-secondary/60 hover:bg-secondary border border-border text-foreground px-3 rounded-md flex items-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={release}
        className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5"
      >
        <CheckCircle2 className="w-3.5 h-3.5" /> Liberar valor (R$ {order.deliveryFee.toFixed(2)})
      </button>
    </li>
  );
}

function FlavorStockSection() {
  const { products, addFlavorStock } = useProducts();
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  const setAmount = (key: string, value: number) => {
    setAmounts((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <section className="bg-[var(--gradient-surface)] border border-border/70 rounded-2xl p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <PackagePlus className="w-4 h-4 text-brand-glow" /> Estoque por sabor
        </h2>
        <span className="text-xs text-muted-foreground">{products.length} produtos</span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Reposição individual por sabor. O total do produto é atualizado automaticamente.
      </p>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {products.map((p) => (
          <FlavorStockProduct key={p.id} product={p} amounts={amounts} setAmount={setAmount} onRestock={addFlavorStock} />
        ))}
      </div>
    </section>
  );
}

function FlavorStockProduct({
  product,
  amounts,
  setAmount,
  onRestock,
}: {
  product: Product;
  amounts: Record<string, number>;
  setAmount: (key: string, value: number) => void;
  onRestock: (id: string, flavor: string, amount: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const flavors = product.flavors && product.flavors.length > 0 ? product.flavors : [];
  const lowStock = flavors.some((f) => (product.flavorStock[f] ?? 0) <= 3);

  return (
    <div className="bg-background/40 border border-border/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full p-3 flex items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{product.name}</p>
          <p className="text-[11px] text-muted-foreground">Total: {product.stock} un.</p>
        </div>
        <div className="flex items-center gap-2">
          {lowStock && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
              Repor
            </span>
          )}
          <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-border/60 p-3 space-y-2">
          {flavors.map((f) => {
            const stock = product.flavorStock[f] ?? 0;
            const key = `${product.id}-${f}`;
            const amt = amounts[key] ?? 10;
            return (
              <div key={f} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{f}</p>
                  <p className={`text-[10px] ${stock <= 3 ? "text-amber-400" : "text-muted-foreground"}`}>
                    {stock} un.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    value={amt}
                    onChange={(e) => setAmount(key, Math.max(1, Number(e.target.value) || 1))}
                    className="w-14 bg-input border border-border rounded px-1.5 py-0.5 text-xs text-center"
                  />
                  <button
                    onClick={() => onRestock(product.id, f, amt)}
                    className="bg-secondary/60 hover:bg-secondary border border-border text-foreground rounded-md px-2 py-1 text-[11px] font-bold"
                  >
                    Repor
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
