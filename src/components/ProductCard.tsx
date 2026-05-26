import { useRef, useState } from "react";
import { Camera, Pencil, Plus, Check, PackagePlus, Trash2 } from "lucide-react";
import { DEFAULT_FLAVORS, type Product } from "@/lib/store";

interface Props {
  product: Product;
  isAdmin: boolean;
  onUpdate: (patch: Partial<Product>) => void;
  onAdd: (flavor: string) => void;
  onRestock?: (amount: number) => void;
  onRestockFlavor?: (flavor: string, amount: number) => void;
  onRemove?: () => void;
}

export function ProductCard({ product, isAdmin, onUpdate, onAdd, onRestock, onRestockFlavor, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(product.name);
  const [desc, setDesc] = useState(product.description);
  const [price, setPrice] = useState(product.price);
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockAmount, setRestockAmount] = useState(10);
  const [added, setAdded] = useState(false);
  const flavors = product.flavors && product.flavors.length > 0 ? product.flavors : DEFAULT_FLAVORS;
  const [flavor, setFlavor] = useState<string>(flavors[0]);
  const [editingFlavors, setEditingFlavors] = useState(false);
  const [flavorsDraft, setFlavorsDraft] = useState(flavors.join(", "));
  const fileRef = useRef<HTMLInputElement>(null);

  const flavorStock = product.flavorStock?.[flavor] ?? 0;
  const outOfStock = product.stock <= 0 || flavorStock <= 0;

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => onUpdate({ image: reader.result as string });
    reader.readAsDataURL(file);
  };

  const save = () => {
    onUpdate({ name, description: desc, price: Number(price) || 0 });
    setEditing(false);
  };

  const handleAdd = () => {
    if (outOfStock) return;
    onAdd(flavor);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="group/card rounded-2xl bg-[var(--gradient-surface)] border border-border/70 overflow-hidden shadow-[var(--shadow-card)] flex flex-col hover:border-primary/50 hover:-translate-y-0.5 transition-all duration-300">
      <div className="relative aspect-square bg-[var(--gradient-surface)] flex items-center justify-center group">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-muted-foreground text-xs text-center px-4">
            <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Sem foto
          </div>
        )}

        {/* Stock badge */}
        <span
          className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur border ${
            outOfStock
              ? "bg-destructive/90 text-destructive-foreground border-destructive/50"
              : flavorStock <= 5
                ? "bg-amber-500/90 text-black border-amber-300/50"
                : "bg-background/80 text-foreground border-border"
          }`}
        >
          {outOfStock ? "Esgotado" : `${flavorStock} un.`}
        </span>

        {isAdmin && (
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-2 right-2 bg-background/80 backdrop-blur p-1.5 rounded-lg border border-border hover:bg-accent transition"
            aria-label="Mudar foto"
          >
            <Camera className="w-4 h-4" />
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        {editing && isAdmin ? (
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-input border border-border rounded-md px-2 py-1 text-sm"
              placeholder="Nome"
            />
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              className="bg-input border border-border rounded-md px-2 py-1 text-xs resize-none"
              placeholder="Descrição"
            />
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="bg-input border border-border rounded-md px-2 py-1 text-sm"
              placeholder="Preço"
            />
            <div className="flex gap-2">
              <button
                onClick={save}
                className="flex-1 bg-secondary/60 hover:bg-secondary border border-border text-foreground rounded-md py-1.5 text-sm font-semibold"
              >
                Salvar
              </button>
              {onRemove && (
                <button
                  onClick={onRemove}
                  className="bg-destructive/20 text-destructive border border-destructive/40 rounded-md px-2"
                  aria-label="Remover"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm leading-tight">{product.name}</h3>
              {isAdmin && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Editar"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
              {product.description}
            </p>

            {isAdmin && editingFlavors ? (
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Sabores (separados por vírgula)</label>
                <textarea
                  value={flavorsDraft}
                  onChange={(e) => setFlavorsDraft(e.target.value)}
                  rows={2}
                  className="w-full bg-input border border-border rounded-md px-2 py-1 text-xs resize-none"
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      const next = flavorsDraft
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      if (next.length > 0) {
                        onUpdate({ flavors: next });
                        setFlavor(next[0]);
                      }
                      setEditingFlavors(false);
                    }}
                    className="flex-1 text-[11px] font-semibold bg-primary text-primary-foreground rounded px-2 py-1"
                  >
                    Salvar sabores
                  </button>
                  <button
                    onClick={() => { setFlavorsDraft(flavors.join(", ")); setEditingFlavors(false); }}
                    className="text-[11px] text-muted-foreground px-2"
                  >
                    X
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {flavors.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFlavor(f)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                      flavor === f
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
                {isAdmin && (
                  <button
                    onClick={() => { setFlavorsDraft(flavors.join(", ")); setEditingFlavors(true); }}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground"
                    title="Editar sabores"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {isAdmin && restockOpen && (
              <div className="flex items-center gap-1 bg-secondary rounded-md p-1">
                <input
                  type="number"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(Number(e.target.value))}
                  className="w-14 bg-input border border-border rounded px-1.5 py-0.5 text-xs"
                />
                <button
                  onClick={() => {
                    if (onRestockFlavor) {
                      onRestockFlavor(flavor, restockAmount);
                    } else {
                      onRestock?.(restockAmount);
                    }
                    setRestockOpen(false);
                  }}
                  className="text-xs font-semibold bg-primary text-primary-foreground rounded px-2 py-0.5"
                >
                  Repor {flavor}
                </button>
                <button
                  onClick={() => setRestockOpen(false)}
                  className="text-[11px] text-muted-foreground px-1"
                >
                  Cancelar
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mt-1 gap-2">
              <span className="text-base font-bold text-brand-glow">
                R$ {product.price.toFixed(2)}
              </span>
              <div className="flex items-center gap-1">
                {isAdmin && !restockOpen && (
                  <button
                    onClick={() => setRestockOpen(true)}
                    className="bg-secondary border border-border text-foreground rounded-lg p-2 hover:bg-accent"
                    aria-label="Repor estoque"
                    title="Repor estoque"
                  >
                    <PackagePlus className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleAdd}
                  disabled={outOfStock}
                  className="bg-secondary/60 hover:bg-secondary border border-border text-foreground rounded-lg p-2 hover:opacity-90 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Adicionar ao carrinho"
                >
                  {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
