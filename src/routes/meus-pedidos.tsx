import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Receipt,
  MessageCircle,
  Star,
  Send,
  Package,
  CheckCircle2,
  Clock,
  Bike,
} from "lucide-react";
import { useAuth, useOrders, type Order } from "@/lib/store";
import { MapRouteView } from "@/components/MapRouteView";

export const Route = createFileRoute("/meus-pedidos")({
  head: () => ({ meta: [{ title: "Meus pedidos — AZk pods" }] }),
  component: MyOrdersPage,
});

function MyOrdersPage() {
  const { user, hydrated } = useAuth();
  const { orders, addMessage, confirmDelivery, rate } = useOrders();
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && !user) navigate({ to: "/login" });
  }, [hydrated, user, navigate]);

  if (!hydrated || !user) return null;

  const mine = orders.filter(
    (o) =>
      o.customerEmail?.toLowerCase() === user.email.toLowerCase() &&
      o.status !== "refused",
  );

  return (
    <div className="min-h-screen pb-16 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-primary/20 blur-[120px]" />

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border/60">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4" /> Loja
          </Link>
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-brand-glow" />
            <span className="text-sm font-semibold">Meus pedidos</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 relative space-y-4">
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground bg-secondary/40 border border-border/60 rounded-xl p-8 text-center">
            Você ainda não fez nenhum pedido.
          </p>
        ) : (
          mine.map((o) => (
            <OrderItem
              key={o.id}
              order={o}
              onSend={(text) => addMessage(o.id, "client", text)}
              onConfirm={(ok) => confirmDelivery(o.id, ok)}
              onRate={(stars, comment) => rate(o.id, stars, comment)}
            />
          ))
        )}
      </main>
    </div>
  );
}

function statusInfo(o: Order) {
  if (o.status === "pending")
    return { label: "Aguardando entregador", icon: <Clock className="w-3.5 h-3.5" />, color: "text-amber-400" };
  if (o.status === "accepted")
    return { label: "A caminho", icon: <Bike className="w-3.5 h-3.5" />, color: "text-sky-400" };
  return { label: "Entregue", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-emerald-400" };
}

function OrderItem({
  order,
  onSend,
  onConfirm,
  onRate,
}: {
  order: Order;
  onSend: (text: string) => void;
  onConfirm: (ok: boolean) => void;
  onRate: (stars: number, comment?: string) => void;
}) {
  const [tab, setTab] = useState<"recibo" | "chat" | "avaliar">("recibo");
  const [msg, setMsg] = useState("");
  const [stars, setStars] = useState(order.rating ?? 0);
  const [comment, setComment] = useState(order.ratingComment ?? "");
  const s = statusInfo(order);
  const date = new Date(order.createdAt);

  const send = () => {
    const t = msg.trim();
    if (!t) return;
    onSend(t);
    setMsg("");
  };

  return (
    <article className="bg-[var(--gradient-surface)] border border-border/70 rounded-2xl shadow-[var(--shadow-card)] overflow-hidden">
      <header className="p-4 border-b border-border/60">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Pedido #{order.id.slice(-6)}
            </p>
            <p className="font-bold text-sm truncate">
              {date.toLocaleDateString("pt-BR")} · {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${s.color}`}>
            {s.icon} {s.label}
          </span>
        </div>
      </header>

      <nav className="grid grid-cols-3 text-xs font-semibold border-b border-border/60">
        {([
          ["recibo", "Recibo", <Receipt key="r" className="w-3.5 h-3.5" />],
          ["chat", "Chat", <MessageCircle key="c" className="w-3.5 h-3.5" />],
          ["avaliar", "Avaliar", <Star key="s" className="w-3.5 h-3.5" />],
        ] as const).map(([key, label, icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`py-2.5 flex items-center justify-center gap-1.5 transition ${
              tab === key
                ? "bg-primary/15 text-brand-glow border-b-2 border-brand-glow"
                : "text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </nav>

      <div className="p-4">
        {tab === "recibo" && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Package className="w-4 h-4" /> Entrega em {order.address}
            </div>
            {order.status === "accepted" && (
              <MapRouteView order={order} mode="client" />
            )}
            <ul className="divide-y divide-border/40 border border-border/40 rounded-lg overflow-hidden">
              {order.items.map((it, i) => (
                <li key={`${it.productId}-${it.flavor ?? ""}-${i}`} className="flex justify-between px-3 py-2 text-xs">
                  <span className="truncate">
                    {it.qty}× {it.name}
                    {it.flavor && <span className="text-brand-glow"> · {it.flavor}</span>}
                  </span>
                  <span>R$ {(it.price * it.qty).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 text-xs">
              <Row label="Subtotal" value={`R$ ${order.subtotal.toFixed(2)}`} />
              <Row label={`Entrega${order.km ? ` (${order.km} km)` : ""}`} value={`R$ ${order.deliveryFee.toFixed(2)}`} />
              <Row label="Pagamento" value={order.payment.toUpperCase()} />
            </div>
            <div className="flex justify-between border-t border-border/60 pt-2 font-bold">
              <span>Total pago</span>
              <span className="text-brand-glow">R$ {order.total.toFixed(2)}</span>
            </div>

            {order.status === "delivered" && (
              <div className="pt-2 border-t border-border/60 space-y-2">
                <p className="text-xs text-muted-foreground">A entrega ocorreu como esperado?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onConfirm(true)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold ${
                      order.deliveryConfirmed === true
                        ? "bg-emerald-500 text-white"
                        : "bg-secondary border border-border"
                    }`}
                  >
                    Sim, tudo certo
                  </button>
                  <button
                    onClick={() => onConfirm(false)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold ${
                      order.deliveryConfirmed === false
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-secondary border border-border"
                    }`}
                  >
                    Tive problema
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "chat" && (
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">
              Converse com o atendimento sobre este pedido.
            </p>
            <div className="bg-secondary/40 border border-border/60 rounded-lg p-2 h-48 overflow-y-auto space-y-1.5">
              {(order.messages ?? []).length === 0 && (
                <p className="text-center text-[11px] text-muted-foreground py-12">
                  Nenhuma mensagem ainda.
                </p>
              )}
              {(order.messages ?? []).map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-xs ${
                    m.from === "client"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-background border border-border"
                  }`}
                >
                  <p className="text-[9px] opacity-70 uppercase tracking-wide mb-0.5">
                    {m.from === "client" ? "Você" : "Atendimento"}
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
                placeholder="Escreva uma mensagem"
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

        {tab === "avaliar" && (
          <div className="space-y-3">
            {order.status !== "delivered" ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Você poderá avaliar o entregador após a entrega.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Como foi seu entregador?</p>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setStars(n)} aria-label={`${n} estrelas`}>
                      <Star
                        className={`w-7 h-7 ${
                          n <= stars
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Deixe um comentário (opcional)"
                  className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                />
                <button
                  disabled={stars === 0}
                  onClick={() => onRate(stars, comment)}
                  className="w-full bg-secondary/60 hover:bg-secondary border border-border text-foreground font-bold py-2.5 rounded-lg disabled:opacity-50"
                >
                  {order.rating ? "Atualizar avaliação" : "Enviar avaliação"}
                </button>
                {order.rating ? (
                  <p className="text-[11px] text-emerald-400 text-center">
                    Avaliação registrada: {order.rating}/5
                  </p>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
