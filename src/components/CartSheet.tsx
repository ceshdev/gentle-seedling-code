import { useEffect, useMemo, useState } from "react";
import { X, Minus, Plus, Trash2, MapPin, Loader2, Copy, Check, LogIn, Pencil } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useAuth, useCart, useCustomerProfile, useOrders, useProducts } from "@/lib/store";

import { quoteDelivery } from "@/lib/delivery.functions";
import { createPixQrCode, checkPixStatus } from "@/lib/payment.functions";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Pix = { id: string; brCode: string; brCodeBase64: string; amount: number; expiresAt: string };

export function CartSheet({ open, onClose }: Props) {
  const { products, decrementStockForCart } = useProducts();
  const { cart, setQty, clear } = useCart();
  const { create: createOrder } = useOrders();
  const { user } = useAuth();
  const { profile, hasProfile, save: saveProfile, remove: removeProfile } = useCustomerProfile(user?.email);
  const [km, setKm] = useState(3);
  const [step, setStep] = useState<"cart" | "checkout" | "done">("cart");
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [complement, setComplement] = useState("");
  const [reference, setReference] = useState("");
  const [pay] = useState<"pix">("pix");
  const [quote, setQuote] = useState<{ lat: number; lng: number; km: number; fee: number; displayName: string } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const quoteFn = useServerFn(quoteDelivery);
  const pixFn = useServerFn(createPixQrCode);
  const checkFn = useServerFn(checkPixStatus);
  const [checking, setChecking] = useState(false);
  const [notPaidMsg, setNotPaidMsg] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingPayer, setEditingPayer] = useState(false);

  const [pixOpen, setPixOpen] = useState(false);
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [payerEmail, setPayerEmail] = useState(user?.email ?? "");
  const [payerCpf, setPayerCpf] = useState("");
  const [pix, setPix] = useState<Pix | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Pré-preenche todos os dados quando há um perfil salvo (compras seguintes).
  useEffect(() => {
    if (!profile) return;
    setName((v) => v || profile.name);
    setStreet((v) => v || profile.street);
    setNumber((v) => v || profile.number);
    setNeighborhood((v) => v || profile.neighborhood);
    setComplement((v) => v || profile.complement);
    setReference((v) => v || profile.reference);
    setPayerName((v) => v || profile.name);
    setPayerPhone((v) => v || profile.phone);
    setPayerEmail((v) => v || profile.email);
    setPayerCpf((v) => v || profile.cpf);
  }, [profile]);

  const lines = useMemo(
    () =>
      cart
        .map((c) => {
          const p = products.find((x) => x.id === c.productId);
          return p ? { ...c, product: p } : null;
        })
        .filter(Boolean) as { productId: string; flavor: string; qty: number; product: ReturnType<typeof products.find> extends infer T ? Exclude<T, undefined> : never }[],
    [cart, products],
  );

  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const delivery = quote?.fee ?? 0;
  const total = subtotal + delivery;

  const addrReady = street.trim() && number.trim();

  const calcQuote = async () => {
    if (!addrReady) return;
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const r = await quoteFn({
        data: {
          street: street.trim(),
          number: number.trim(),
          neighborhood: neighborhood.trim(),
          complement: complement.trim(),
          reference: reference.trim(),
          city: "Goiânia",
        },
      });
      setQuote(r);
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : "Erro ao calcular entrega");
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  };

  const finish = () => {
    if (!quote) return;
    createOrder({
      customerName: name,
      customerEmail: user?.email,
      address: quote.displayName,
      lat: quote.lat,
      lng: quote.lng,
      km: quote.km,
      payment: pay,
      items: lines.map((l) => ({
        productId: l.productId,
        name: l.product.name,
        flavor: l.flavor,
        qty: l.qty,
        price: l.product.price,
      })),
      subtotal,
      deliveryFee: delivery,
      total,
    });
    // Salva/atualiza perfil para próximas compras.
    if (user?.email) {
      saveProfile({
        name,
        phone: payerPhone,
        email: payerEmail || user.email,
        cpf: payerCpf,
        street,
        number,
        neighborhood,
        complement,
        reference,
      });
    }
    decrementStockForCart(cart);
    setStep("done");
    setEditingAddress(false);
    setEditingPayer(false);
    clear();
  };

  const close = () => {
    setStep("cart");
    setPixOpen(false);
    setPix(null);
    setPixError(null);
    onClose();
  };

  const handlePrimary = () => {
    if (step === "cart") return setStep("checkout");
    if (pay === "pix") {
      setPixError(null);
      setPix(null);
      setPayerName(name);
      setPixOpen(true);
      return;
    }
    finish();
  };

  const generatePix = async () => {
    setPixError(null);
    setPixLoading(true);
    try {
      const r = await pixFn({
        data: {
          amount: Math.round(total * 100),
          description: `Pedido AZk pods (${lines.length} itens)`,
          customer: {
            name: payerName.trim(),
            email: payerEmail.trim(),
            cellphone: payerPhone.trim(),
            taxId: payerCpf.trim(),
          },
        },
      });
      setPix(r);
    } catch (e) {
      setPixError(e instanceof Error ? e.message : "Erro ao gerar QR Code");
    } finally {
      setPixLoading(false);
    }
  };

  const confirmPixPaid = async () => {
    if (!pix) return;
    setNotPaidMsg(null);
    setChecking(true);
    try {
      const r = await checkFn({ data: { id: pix.id } });
      if (r.status === "PAID") {
        setPixOpen(false);
        setPix(null);
        finish();
      } else {
        setNotPaidMsg(`Pagamento ainda não identificado (status: ${r.status}). Tente novamente em alguns segundos.`);
      }
    } catch (e) {
      setNotPaidMsg(e instanceof Error ? e.message : "Erro ao verificar pagamento");
    } finally {
      setChecking(false);
    }
  };

  const copyBrCode = async () => {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.brCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full sm:max-w-md bg-card border-t sm:border border-border rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold text-lg">
            {step === "cart" && "Seu carrinho"}
            {step === "checkout" && "Finalizar pedido"}
            {step === "done" && "Pedido confirmado"}
          </h2>
          <button onClick={close} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {step === "cart" && (
            <>
              {lines.length === 0 ? (
                <p className="text-center text-muted-foreground py-12 text-sm">
                  Seu carrinho está vazio.
                </p>
              ) : (
                lines.map((l) => (
                  <div key={`${l.productId}-${l.flavor}`} className="flex gap-3 bg-secondary rounded-lg p-2">
                    <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {l.product.image && (
                        <img src={l.product.image} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{l.product.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{l.product.brand}</p>
                      <p className="text-[11px] text-brand-glow font-semibold mt-0.5">
                        Sabor: {l.flavor}
                      </p>
                      <p className="text-sm font-bold text-brand-glow mt-1">
                        R$ {(l.product.price * l.qty).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button
                        onClick={() => setQty(l.productId, l.flavor, 0)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1.5 bg-background rounded-md">
                        <button
                          onClick={() => setQty(l.productId, l.flavor, l.qty - 1)}
                          className="p-1"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-semibold w-5 text-center">{l.qty}</span>
                        <button
                          onClick={() => setQty(l.productId, l.flavor, l.qty + 1)}
                          className="p-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {step === "checkout" && (
            <div className="space-y-3">
              {hasProfile && !editingAddress && (
                <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs space-y-0.5 min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Dados salvos</p>
                      <p className="font-semibold truncate">{name || profile?.name}</p>
                      <p className="text-muted-foreground truncate">
                        {street}{number ? `, ${number}` : ""}{neighborhood ? ` — ${neighborhood}` : ""}
                      </p>
                      {complement && <p className="text-muted-foreground truncate">{complement}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingAddress(true)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-brand-glow hover:underline shrink-0"
                    >
                      <Pencil className="w-3 h-3" /> Editar
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirm("Excluir dados de endereço e pagamento salvos? Você terá que preencher tudo de novo na próxima compra.")) return;
                      removeProfile();
                      setName(""); setStreet(""); setNumber(""); setNeighborhood(""); setComplement(""); setReference("");
                      setPayerName(""); setPayerPhone(""); setPayerCpf("");
                      setEditingAddress(true);
                      setEditingPayer(true);
                    }}
                    className="w-full flex items-center justify-center gap-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10 border border-destructive/40 rounded-md py-1.5"
                  >
                    <Trash2 className="w-3 h-3" /> Excluir dados salvos
                  </button>
                </div>
              )}

              {(!hasProfile || editingAddress) && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">Nome</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Endereço de entrega (Goiânia)</label>

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        value={street}
                        onChange={(e) => { setStreet(e.target.value); setQuote(null); }}
                        className="col-span-2 bg-input border border-border rounded-md px-3 py-2 text-sm"
                        placeholder="Nome da rua / avenida"
                      />
                      <input
                        value={number}
                        onChange={(e) => { setNumber(e.target.value); setQuote(null); }}
                        className="bg-input border border-border rounded-md px-3 py-2 text-sm"
                        placeholder="Nº"
                        inputMode="numeric"
                      />
                      <input
                        value={neighborhood}
                        onChange={(e) => { setNeighborhood(e.target.value); setQuote(null); }}
                        className="col-span-3 bg-input border border-border rounded-md px-3 py-2 text-sm"
                        placeholder="Bairro"
                      />
                      <input
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                        className="col-span-3 bg-input border border-border rounded-md px-3 py-2 text-sm"
                        placeholder="Complemento (apto, bloco, casa)"
                      />
                      <input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        className="col-span-3 bg-input border border-border rounded-md px-3 py-2 text-sm"
                        placeholder="Ponto de referência (ex: portão preto, em frente à padaria)"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={calcQuote}
                disabled={quoteLoading || !addrReady}
                className="w-full px-3 py-2 rounded-md bg-secondary/60 hover:bg-secondary border border-border text-foreground text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {quoteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                Calcular entrega
              </button>

              {quoteError && <p className="text-[11px] text-destructive">{quoteError}</p>}
              {quote && (
                <div className="mt-1 space-y-2">
                  <div className="rounded-lg overflow-hidden border border-border h-48">
                    <iframe
                      title="Localização do cliente"
                      className="w-full h-full"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${quote.lng - 0.004}%2C${quote.lat - 0.003}%2C${quote.lng + 0.004}%2C${quote.lat + 0.003}&layer=mapnik&marker=${quote.lat}%2C${quote.lng}`}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    <span className="text-foreground font-semibold">Endereço localizado:</span> {quote.displayName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Distância: <span className="text-foreground font-semibold">{quote.km} km</span> · Taxa: <span className="text-brand-glow font-semibold">R$ {quote.fee.toFixed(2)}</span>
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground">Pagamento</label>
                <div className="mt-1 px-3 py-2 rounded-md border border-primary bg-primary text-primary-foreground text-xs font-semibold text-center">
                  PIX
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">No momento aceitamos apenas Pix.</p>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary mx-auto flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-bold">Pagamento confirmado!</p>
              <p className="text-sm text-muted-foreground mt-2">
                Seu produto chegará em breve.
              </p>
              {user && (
                <a
                  href="/meus-pedidos"
                  className="inline-block mt-4 text-xs font-semibold text-brand-glow underline"
                >
                  Ver recibo e acompanhar →
                </a>
              )}
            </div>
          )}
        </div>

        {step !== "done" && lines.length > 0 && (
          <div className="border-t border-border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            {step === "checkout" && quote && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Entrega ({quote.km}km)</span>
                <span>R$ {delivery.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-brand-glow">
                R$ {(step === "checkout" ? total : subtotal).toFixed(2)}
              </span>
            </div>
            {step === "cart" && !user ? (
              <Link
                to="/login"
                onClick={close}
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl mt-2 flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Entrar para comprar
              </Link>
            ) : (
              <button
                onClick={handlePrimary}
                disabled={step === "checkout" && (!name || !quote)}
                className="w-full bg-secondary/60 hover:bg-secondary border border-border text-foreground font-bold py-3 rounded-xl mt-2 disabled:opacity-50"
              >
                {step === "cart"
                  ? "Ir para pagamento"
                  : quote
                    ? `Gerar Pix R$ ${total.toFixed(2)}`
                    : "Calcule a entrega"}
              </button>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="p-4 border-t border-border">
            <button
              onClick={close}
              className="w-full bg-secondary/60 hover:bg-secondary border border-border text-foreground font-bold py-3 rounded-xl"
            >
              Continuar comprando
            </button>
          </div>
        )}
      </div>

      {pixOpen && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !pixLoading && setPixOpen(false)} />
          <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">{pix ? "Pague com Pix" : "Dados para pagamento"}</h3>
              <button onClick={() => !pixLoading && setPixOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!pix ? (
              <div className="space-y-3">
                {hasProfile && !editingPayer ? (
                  <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Dados de pagamento salvos</p>
                      <button
                        type="button"
                        onClick={() => setEditingPayer(true)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-brand-glow hover:underline"
                      >
                        <Pencil className="w-3 h-3" /> Editar
                      </button>
                    </div>
                    <p className="text-sm font-semibold truncate">{payerName}</p>
                    <p className="text-xs text-muted-foreground truncate">{payerEmail} · {payerPhone}</p>
                    <p className="text-xs text-muted-foreground">CPF: {payerCpf}</p>
                  </div>
                ) : (
                  <>
                    <PixField label="Nome completo" value={payerName} onChange={setPayerName} placeholder="João da Silva" />
                    <PixField label="Telefone" value={payerPhone} onChange={setPayerPhone} placeholder="(62) 99999-9999" />
                    <PixField label="E-mail" value={payerEmail} onChange={setPayerEmail} placeholder="voce@email.com" type="email" />
                    <PixField label="CPF" value={payerCpf} onChange={setPayerCpf} placeholder="000.000.000-00" />
                  </>
                )}
                {pixError && <p className="text-xs text-destructive">{pixError}</p>}
                <button
                  onClick={generatePix}
                  disabled={pixLoading || !payerName.trim() || !payerEmail.trim() || !payerPhone.trim() || payerCpf.replace(/\D/g, "").length !== 11}
                  className="w-full bg-secondary/60 hover:bg-secondary border border-border text-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {pixLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Criar QR Code
                </button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Total a pagar: <span className="text-brand-glow font-semibold">R$ {total.toFixed(2)}</span>
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <div className="bg-white p-3 rounded-xl inline-block mx-auto">
                  <img
                    src={pix.brCodeBase64.startsWith("data:") ? pix.brCodeBase64 : `data:image/png;base64,${pix.brCodeBase64}`}
                    alt="QR Code Pix"
                    className="w-56 h-56 object-contain"
                  />
                </div>
                <p className="text-sm font-semibold">R$ {(pix.amount / 100).toFixed(2)}</p>
                <p className="text-[11px] text-muted-foreground">
                  Escaneie no app do seu banco ou copie o código abaixo.
                </p>
                <div className="bg-secondary border border-border rounded-lg p-2 text-[10px] break-all text-left font-mono">
                  {pix.brCode}
                </div>
                <button
                  onClick={copyBrCode}
                  className="w-full bg-secondary/60 hover:bg-secondary border border-border text-foreground font-semibold py-2 rounded-lg flex items-center justify-center gap-2 text-sm"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copiado!" : "Copiar código"}
                </button>
                {notPaidMsg && <p className="text-xs text-destructive">{notPaidMsg}</p>}
                <button
                  onClick={confirmPixPaid}
                  disabled={checking}
                  className="w-full bg-secondary/60 hover:bg-secondary border border-border text-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {checking ? "Verificando pagamento…" : "Já paguei — confirmar pedido"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PixField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-input border border-border rounded-md px-3 py-2 text-sm"
      />
    </label>
  );
}
