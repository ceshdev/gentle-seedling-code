import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingBag, Zap, Plus, LogIn, LogOut, Shield, Bike, Receipt } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { CartSheet } from "@/components/CartSheet";
import { useAuth, useCart, useProducts, type Brand } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AZk pods — pods premium com entrega rápida" },
      {
        name: "description",
        content:
          "Catálogo AZk pods: Ignite, ElfBar e BlackSheep. Peça pelo app e receba em casa.",
      },
    ],
  }),
  component: Home,
});

const BRANDS: { id: Brand; label: string; tag: string }[] = [
  { id: "ignite", label: "Ignite", tag: "Clássico" },
  { id: "elfbar", label: "ElfBar", tag: "Best-seller" },
  { id: "blacksheep", label: "BlackSheep", tag: "Premium" },
];

function isDeliveryOff() {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 7;
}

function Home() {
  const { products, updateProduct, addStock, addFlavorStock, addProduct, removeProduct } = useProducts();
  const { add, count } = useCart();
  const { user, isAdmin, isCourier, logout } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const [active, setActive] = useState<Brand>("ignite");

  const filtered = products.filter((p) => p.brand === active);
  const deliveryOff = isDeliveryOff();

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-primary/20 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute top-40 -right-24 w-[380px] h-[380px] rounded-full bg-brand-glow/15 blur-[120px]" />

      <header className="sticky top-0 z-40 bg-[var(--gradient-surface)] border border-border/70 rounded-b-2xl shadow-[var(--shadow-card)] mx-2 mt-2">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative w-10 h-10 rounded-2xl bg-[var(--gradient-brand)] flex items-center justify-center shadow-[var(--shadow-glow)]">
              <Zap className="w-5 h-5 text-primary-foreground" />
              <span className="absolute inset-0 rounded-2xl ring-1 ring-white/20" />
            </div>
            <h1 className="font-bold text-xl tracking-tight leading-none text-white">
              AZk<span className="text-brand-glow">pods</span>
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <Link
                to="/admin"
                className="bg-secondary/80 border border-border/70 p-2.5 rounded-xl hover:bg-accent hover:border-primary/40 transition shadow-sm"
                title="Painel admin"
              >
                <Shield className="w-5 h-5" />
              </Link>
            )}
            {isCourier && (
              <Link
                to="/entregador"
                className="bg-secondary/80 border border-border/70 p-2.5 rounded-xl hover:bg-accent hover:border-primary/40 transition shadow-sm"
                title="Pedidos"
              >
                <Bike className="w-5 h-5" />
              </Link>
            )}
            {user && !isAdmin && !isCourier && (
              <Link
                to="/meus-pedidos"
                className="bg-secondary/80 border border-border/70 p-2.5 rounded-xl hover:bg-accent hover:border-primary/40 transition shadow-sm"
                title="Meus pedidos"
              >
                <Receipt className="w-5 h-5" />
              </Link>
            )}
            {user ? (
              <button
                onClick={logout}
                className="bg-secondary/80 border border-border/70 p-2.5 rounded-xl hover:bg-accent hover:border-primary/40 transition shadow-sm"
                title={`Sair (${user.name})`}
              >
                <LogOut className="w-5 h-5" />
              </button>
            ) : (
              <Link
                to="/login"
                className="bg-secondary/80 border border-border/70 p-2.5 rounded-xl hover:bg-accent hover:border-primary/40 transition shadow-sm"
                title="Entrar"
              >
                <LogIn className="w-5 h-5" />
              </Link>
            )}
            <button
              onClick={() => setCartOpen(true)}
              className="relative bg-secondary/80 border border-border/70 p-2.5 rounded-xl hover:bg-accent hover:border-primary/40 transition shadow-sm"
            >
              <ShoppingBag className="w-5 h-5" />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-[var(--shadow-glow)]">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 relative">
        <section className="py-6">
          <div className="rounded-3xl bg-[var(--gradient-brand)] p-6 relative overflow-hidden border border-white/10">
            <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute -left-6 -top-6 w-32 h-32 rounded-full bg-black/20 blur-2xl" />
            <span className="relative inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground bg-secondary/80 backdrop-blur px-2.5 py-1 rounded-full border border-border/70">
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${deliveryOff ? "bg-red-500" : "bg-emerald-300"}`} />
              {deliveryOff ? "Entregas off" : "Entregando agora"}
            </span>
            <h2 className="relative text-2xl font-bold text-primary-foreground leading-tight mt-3">
              Seu pod favorito,<br />entregue hoje.
            </h2>
          </div>
        </section>

        <nav className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 snap-x scrollbar-none">
          {BRANDS.map((b) => (
            <button
              key={b.id}
              onClick={() => setActive(b.id)}
              className={`snap-start flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                active === b.id
                  ? "bg-secondary/60 hover:bg-secondary border border-border text-foreground border-transparent scale-105"
                  : "bg-secondary/60 backdrop-blur text-foreground border-border/60 hover:border-primary/40"
              }`}
            >
              {b.label}
              <span className="ml-1.5 opacity-60 text-[10px]">{b.tag}</span>
            </button>
          ))}
        </nav>

        <section className="grid grid-cols-2 gap-3 pt-2 relative">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              isAdmin={isAdmin}
              onUpdate={(patch) => updateProduct(p.id, patch)}
              onAdd={(flavor) => add(p.id, flavor)}
              onRestock={(amt) => addStock(p.id, amt)}
              onRestockFlavor={(flavor, amt) => addFlavorStock(p.id, flavor, amt)}
              onRemove={() => removeProduct(p.id)}
            />
          ))}
          {isAdmin && (
            <button
              onClick={() => addProduct(active)}
              className="rounded-2xl border-2 border-dashed border-border/70 hover:border-primary/60 hover:bg-secondary/30 transition aspect-square flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-8 h-8" />
              <span className="text-xs font-semibold">Novo produto</span>
            </button>
          )}
        </section>

        {!isAdmin && (
          <p className="text-center text-[11px] text-muted-foreground mt-8">
            É administrador? <Link to="/login" className="text-brand-glow underline">Entrar no painel</Link>
          </p>
        )}
      </main>

      {count > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-secondary/60 hover:bg-secondary border border-border text-foreground font-bold px-6 py-3 rounded-full flex items-center gap-2"
        >
          <ShoppingBag className="w-5 h-5" />
          Ver carrinho ({count})
        </button>
      )}

      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
