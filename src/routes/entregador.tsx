import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bike, MapPin, Check, X, Package, Clock, Wallet, TrendingUp, Trash2, Banknote, AlertTriangle, MessageCircle, Send, Lock, ShoppingBag, Receipt } from "lucide-react";
import { useAuth, useOrders, useCouriers, useWithdrawals, useCustomerProfile, detectPixType, type Withdrawal, type Order } from "@/lib/store";
import { MapRouteView } from "@/components/MapRouteView";

export const Route = createFileRoute("/entregador")({
  head: () => ({ meta: [{ title: "Painel do entregador — AZk pods" }] }),
  component: CourierDashboard,
});

function CourierDashboard() {
  const { user, isCourier, hydrated, logout } = useAuth();
  const { orders, accept, deliver, refuse, clearCourierHistory, markWithdrawn, reportProblem, addMessage } = useOrders();
  const { couriers } = useCouriers();
  const { withdrawals, add: addWithdrawal } = useWithdrawals();
  const { hasProfile, remove: removeProfile } = useCustomerProfile(user?.email);
  const [withdrawing, setWithdrawing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && !isCourier) navigate({ to: "/login" });
  }, [hydrated, isCourier, navigate]);

  if (!hydrated || !isCourier || !user) return null;

  // Pedidos pendentes nunca devem aparecer para o próprio entregador que os fez (caso ele compre na loja).
  const pending = orders.filter((o) => o.status === "pending" && o.customerEmail?.toLowerCase() !== user?.email.toLowerCase());
  const mine = orders.filter(
    (o) => o.courierEmail === user.email && o.status !== "delivered",
  );
  const allDone = orders.filter(
    (o) => o.courierEmail === user.email && o.status === "delivered",
  );
  const done = allDone.filter(
    (o) => !(o.hiddenForCourier ?? []).includes(user.email),
  );

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();

  const withdrawableOrders = allDone.filter(
    (o) => o.createdAt >= todayMs && !o.withdrawnAt && !o.feeFrozen,
  );
  const frozenOrders = allDone.filter((o) => o.feeFrozen);
  const frozenTotal = frozenOrders.reduce((s, o) => s + o.deliveryFee, 0);
  const earnedToday = allDone
    .filter((o) => o.createdAt >= todayMs)
    .reduce((s, o) => s + o.deliveryFee, 0);
  const availableToday = withdrawableOrders.reduce((s, o) => s + o.deliveryFee, 0);
  const earnedTotal = allDone.reduce((s, o) => s + o.deliveryFee, 0);
  const pendingEarnings = mine.reduce((s, o) => s + o.deliveryFee, 0);

  const myCourier = couriers.find((c) => c.email.toLowerCase() === user.email.toLowerCase());
  const myWithdrawals = withdrawals.filter((w) => w.courierEmail === user.email);

  const handleWithdraw = () => {
    if (!myCourier?.pix) {
      alert("Cadastre uma chave PIX com o admin para sacar.");
      return;
    }
    if (availableToday < 3.5) {
      alert("Valor mínimo de saque: R$ 3,50.");
      return;
    }
    const orderIds = withdrawableOrders.map((o) => o.id);
    const pixType = detectPixType(myCourier.pix);
    const localId = `w-${Date.now()}`;

    const draft: Withdrawal = {
      id: localId,
      courierEmail: user.email,
      courierName: user.name,
      pix: myCourier.pix,
      pixType,
      amount: availableToday,
      orderIds,
      createdAt: Date.now(),
      status: "pending",
    };
    setWithdrawing(true);
    try {
      addWithdrawal(draft);
      markWithdrawn(orderIds, localId);
      alert(
        `Saque de R$ ${availableToday.toFixed(2)} registrado! O admin enviará o PIX para sua chave em breve.`,
      );
    } finally {
      setWithdrawing(false);
    }
  };


  return (
    <div className="min-h-screen pb-16 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-primary/20 blur-[120px]" />

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border/60">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center gap-1.5 text-xs font-semibold">
            <ShoppingBag className="w-4 h-4" /> Loja
          </Link>
          <Link to="/meus-pedidos" className="flex items-center gap-1.5 text-xs font-semibold text-brand-glow">
            <Receipt className="w-4 h-4" /> Meus pedidos
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <Bike className="w-4 h-4 text-brand-glow shrink-0" />
            <span className="text-sm font-semibold truncate max-w-[100px]">{user.name}</span>
            <button onClick={logout} className="text-xs text-muted-foreground hover:text-foreground ml-1">
              sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 relative space-y-6">
        <section className="grid grid-cols-3 gap-2">
          <EarningCard
            icon={<Wallet className="w-4 h-4" />}
            label="Hoje"
            value={earnedToday}
          />
          <EarningCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Total"
            value={earnedTotal}
          />
          <EarningCard
            icon={<Clock className="w-4 h-4" />}
            label="A receber"
            value={pendingEarnings}
          />
        </section>

        <section className="bg-[var(--gradient-surface)] border border-primary/40 rounded-2xl p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5" /> Disponível para saque hoje
              </p>
              <p className="text-2xl font-bold text-brand-glow mt-0.5">R$ {availableToday.toFixed(2)}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                PIX: <span className="font-mono">{myCourier?.pix ?? "—"}</span>
              </p>
            </div>
            <button
              onClick={handleWithdraw}
              disabled={withdrawing || availableToday < 3.5 || !myCourier?.pix}
              className="bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Banknote className="w-4 h-4" />
              Sacar
            </button>
          </div>
          {myWithdrawals.length > 0 && (
            <ul className="mt-3 pt-3 border-t border-border/40 space-y-1 max-h-32 overflow-y-auto">
              {myWithdrawals.slice(0, 5).map((w) => (
                <li key={w.id} className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {new Date(w.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  <span className="font-semibold">R$ {w.amount.toFixed(2)}</span>
                  <span
                    className={
                      w.status === "paid"
                        ? "text-emerald-400"
                        : w.status === "failed"
                          ? "text-destructive"
                          : "text-amber-400"
                    }
                  >
                    {w.status === "paid" ? "Pago" : w.status === "failed" ? "Falhou" : "Processando"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>


        <Section
          icon={<Clock className="w-5 h-5 text-brand-glow" />}
          title="Pedidos disponíveis"
          count={pending.length}
          empty="Nenhum pedido aguardando no momento."
        >

          {pending.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              action={
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (confirm("Recusar este pedido? O recibo sumirá da tela do cliente.")) {
                        refuse(o.id, user.email);
                      }
                    }}
                    className="bg-destructive/15 hover:bg-destructive/25 border border-destructive/40 text-destructive rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Recusar
                  </button>
                  <button
                    onClick={() => accept(o.id, user.email)}
                    className="bg-secondary/60 hover:bg-secondary border border-border text-foreground rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Aceitar
                  </button>
                </div>
              }
            />
          ))}
        </Section>

        <Section
          icon={<Package className="w-5 h-5 text-brand-glow" />}
          title="Minhas entregas em andamento"
          count={mine.length}
          empty="Você ainda não aceitou nenhum pedido."
        >
          {mine.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              highlight
              extra={
                <>
                  <MapRouteView order={o} mode="courier" />
                  <CourierProblemPanel
                    order={o}
                    onReport={(reason) => reportProblem(o.id, reason)}
                    onSend={(text) => addMessage(o.id, "courier", text)}
                  />
                </>
              }
              action={
                <button
                  onClick={() => deliver(o.id)}
                  className="bg-secondary/60 hover:bg-secondary border border-border text-foreground rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Marcar entregue
                </button>
              }
            />
          ))}
        </Section>

        {frozenOrders.length > 0 && (
          <Section
            icon={<Lock className="w-5 h-5 text-amber-400" />}
            title="Valores bloqueados"
            count={frozenOrders.length}
            empty=""
          >
            <li className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-200 mb-2">
              R$ {frozenTotal.toFixed(2)} aguardando o admin esclarecer. Use o chat de cada pedido para falar com o admin.
            </li>
            {frozenOrders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                extra={
                  <CourierProblemPanel
                    order={o}
                    onReport={(reason) => reportProblem(o.id, reason)}
                    onSend={(text) => addMessage(o.id, "courier", text)}
                  />
                }
              />
            ))}
          </Section>
        )}

        {done.length > 0 && (
          <Section
            icon={<Check className="w-5 h-5 text-brand-glow" />}
            title="Entregues"
            count={done.length}
            empty=""
          >
            {allDone.length >= 10 && (
              <li className="mb-2">
                <button
                  onClick={() => {
                    if (confirm("Limpar recibos da sua tela? Os dados continuam salvos para o admin.")) {
                      clearCourierHistory(user.email);
                    }
                  }}
                  className="w-full bg-destructive/15 hover:bg-destructive/25 border border-destructive/40 text-destructive rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar recibos ({done.length})
                </button>
              </li>
            )}
            {done.slice(0, 10).map((o) => (
              <OrderCard key={o.id} order={o} muted />
            ))}
          </Section>
        )}

        {hasProfile && (
          <section className="bg-secondary/30 border border-border/60 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold">Dados de compra salvos</p>
              <p className="text-[11px] text-muted-foreground">Endereço e pagamento usados quando você compra na loja.</p>
            </div>
            <button
              onClick={() => {
                if (confirm("Excluir dados salvos de endereço e pagamento?")) removeProfile();
              }}
              className="flex items-center gap-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10 border border-destructive/40 rounded-md px-2 py-1.5 shrink-0"
            >
              <Trash2 className="w-3 h-3" /> Excluir
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

function EarningCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 border ${
        accent
          ? "bg-[var(--gradient-brand)] border-transparent text-primary-foreground"
          : "bg-[var(--gradient-surface)] border-border/70"
      }`}
    >
      <div className={`flex items-center gap-1 text-[10px] uppercase tracking-wide ${accent ? "opacity-90" : "text-muted-foreground"}`}>
        {icon} {label}
      </div>
      <p className={`font-bold text-lg mt-1 ${accent ? "" : "text-brand-glow"}`}>
        R$ {value.toFixed(2)}
      </p>
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  empty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-lg flex items-center gap-2">
          {icon} {title}
        </h2>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      {count === 0 ? (
        empty && (
          <p className="text-sm text-muted-foreground bg-secondary/40 border border-border/60 rounded-xl p-6 text-center">
            {empty}
          </p>
        )
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </section>
  );
}

function OrderCard({
  order,
  action,
  highlight,
  muted,
  extra,
}: {
  order: import("@/lib/store").Order;
  action?: React.ReactNode;
  highlight?: boolean;
  muted?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <li
      className={`border rounded-xl p-3 space-y-2 ${
        muted
          ? "bg-secondary/30 border-border/40 opacity-70"
          : highlight
            ? "bg-[var(--gradient-surface)] border-primary/40"
            : "bg-[var(--gradient-surface)] border-border/70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{order.customerName}</p>
          <p className="text-xs text-muted-foreground flex items-start gap-1">
            <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span className="truncate">{order.address}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-brand-glow">
            R$ {order.total.toFixed(2)}
          </p>
          {order.km != null && (
            <p className="text-[10px] text-muted-foreground">{order.km} km</p>
          )}
        </div>
      </div>
      <ul className="text-xs text-muted-foreground space-y-0.5 border-t border-border/40 pt-2">
        {order.items.map((it, i) => (
          <li key={`${it.productId}-${it.flavor ?? ""}-${i}`} className="flex justify-between">
            <span className="truncate">
              {it.qty}× {it.name}
              {it.flavor && <span className="text-brand-glow"> · {it.flavor}</span>}
            </span>
            <span>R$ {(it.price * it.qty).toFixed(2)}</span>
          </li>
        ))}
        <li className="flex justify-between pt-1">
          <span>Taxa entrega</span>
          <span>R$ {order.deliveryFee.toFixed(2)}</span>
        </li>
        <li className="flex justify-between font-semibold text-foreground">
          <span>Pagamento</span>
          <span className="capitalize">{order.payment}</span>
        </li>
      </ul>
      {extra && <div className="pt-1">{extra}</div>}
      {action && <div className="flex justify-end pt-1">{action}</div>}
    </li>
  );
}

function CourierProblemPanel({
  order,
  onReport,
  onSend,
}: {
  order: Order;
  onReport: (reason: string) => void;
  onSend: (text: string) => void;
}) {
  const [open, setOpen] = useState(!!order.problem);
  const [msg, setMsg] = useState("");
  const messages = order.messages ?? [];

  const handleReport = () => {
    const reason = prompt(
      "Descreva o problema (ex.: endereço errado, cliente sumiu, produto avariado):",
    )?.trim();
    if (!reason) return;
    onReport(reason);
    setOpen(true);
  };

  const send = () => {
    const t = msg.trim();
    if (!t) return;
    onSend(t);
    setMsg("");
  };

  return (
    <div className="mt-2 space-y-2">
      {!order.problem && !order.feeFrozen && (
        <button
          onClick={handleReport}
          className="w-full bg-destructive/10 hover:bg-destructive/20 border border-destructive/40 text-destructive rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Reportar problema na entrega
        </button>
      )}

      {order.feeFrozen && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-2 text-[11px] text-amber-200 flex items-start gap-1.5">
          <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Valor de R$ {order.deliveryFee.toFixed(2)} bloqueado</p>
            {order.problem?.reason && <p className="opacity-80">Motivo: {order.problem.reason}</p>}
            <p className="opacity-80">Converse com o admin abaixo. Será liberado após o esclarecimento.</p>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-[11px] text-brand-glow flex items-center justify-center gap-1 py-1"
      >
        <MessageCircle className="w-3 h-3" />
        {open ? "Fechar chat" : `Chat com admin${messages.length ? ` (${messages.length})` : ""}`}
      </button>

      {open && (
        <div className="bg-secondary/40 border border-border/60 rounded-lg p-2 space-y-2">
          <div className="max-h-40 overflow-y-auto space-y-1.5">
            {messages.length === 0 && (
              <p className="text-center text-[11px] text-muted-foreground py-4">
                Nenhuma mensagem ainda.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs ${
                  m.from === "courier"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : m.from === "admin"
                      ? "bg-background border border-border"
                      : "bg-background/60 border border-border italic"
                }`}
              >
                <p className="text-[9px] opacity-70 uppercase tracking-wide mb-0.5">
                  {m.from === "courier" ? "Você" : m.from === "admin" ? "Admin" : "Cliente"}
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
              placeholder="Mensagem para o admin"
              className="flex-1 bg-input border border-border rounded-md px-3 py-2 text-xs"
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
    </div>
  );
}
