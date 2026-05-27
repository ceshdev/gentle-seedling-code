import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEFAULT_FLAVORS = ["Icy Mint", "Blueberry", "Strawberry", "Peach", "Watermelon"];

export const seedDefaultProducts = createServerFn({ method: "POST" }).handler(async () => {
  const { count, error: countErr } = await supabaseAdmin
    .from("products")
    .select("id", { count: "exact", head: true });
  if (countErr) throw new Error(countErr.message);
  if ((count ?? 0) > 0) return { seeded: false };

  const rows: any[] = [];
  let pos = 0;
  for (const brand of ["ignite", "elfbar", "blacksheep"]) {
    for (const i of [1, 2, 3]) {
      rows.push({
        id: `${brand}-pod-${i}`,
        brand,
        name: `Pod ${i}`,
        description: "Edite a descrição e adicione uma foto do produto.",
        price: 45,
        image: "",
        stock: 50,
        flavors: DEFAULT_FLAVORS,
        flavor_stock: Object.fromEntries(DEFAULT_FLAVORS.map((f) => [f, 10])),
        position: pos++,
      });
    }
  }
  const { error } = await supabaseAdmin.from("products").insert(rows);
  if (error) throw new Error(error.message);
  return { seeded: true };
});

type ProductPatch = {
  id: string;
  patch: Record<string, unknown>;
};

export const updateProductFn = createServerFn({ method: "POST" })
  .inputValidator((input: ProductPatch) => input)
  .handler(async ({ data }) => {
    const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(data.patch)) {
      if (k === "flavorStock") dbPatch.flavor_stock = v;
      else dbPatch[k] = v;
    }
    const { error } = await supabaseAdmin.from("products").update(dbPatch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addProductFn = createServerFn({ method: "POST" })
  .inputValidator((input: { brand: string }) => input)
  .handler(async ({ data }) => {
    const { data: existing } = await supabaseAdmin
      .from("products")
      .select("position")
      .order("position", { ascending: false })
      .limit(1);
    const nextPos = (existing?.[0]?.position ?? -1) + 1;
    const row = {
      id: `${data.brand}-pod-${Date.now()}`,
      brand: data.brand,
      name: `Novo Pod`,
      description: "Novo produto — edite os detalhes.",
      price: 45,
      image: "",
      stock: 50,
      flavors: DEFAULT_FLAVORS,
      flavor_stock: Object.fromEntries(DEFAULT_FLAVORS.map((f) => [f, 10])),
      position: nextPos,
    };
    const { error } = await supabaseAdmin.from("products").insert(row);
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const removeProductFn = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const decrementStockFn = createServerFn({ method: "POST" })
  .inputValidator((input: { items: { productId: string; flavor: string; qty: number }[] }) => input)
  .handler(async ({ data }) => {
    const byProduct = new Map<string, { totalQty: number; perFlavor: Record<string, number> }>();
    for (const it of data.items) {
      const entry = byProduct.get(it.productId) ?? { totalQty: 0, perFlavor: {} };
      entry.totalQty += it.qty;
      entry.perFlavor[it.flavor] = (entry.perFlavor[it.flavor] ?? 0) + it.qty;
      byProduct.set(it.productId, entry);
    }
    for (const [id, agg] of byProduct.entries()) {
      const { data: row, error: readErr } = await supabaseAdmin
        .from("products")
        .select("stock, flavor_stock")
        .eq("id", id)
        .single();
      if (readErr) throw new Error(readErr.message);
      const nextFlavorStock = { ...(row.flavor_stock as Record<string, number>) };
      for (const [f, q] of Object.entries(agg.perFlavor)) {
        nextFlavorStock[f] = Math.max(0, (nextFlavorStock[f] ?? 0) - q);
      }
      const { error: updErr } = await supabaseAdmin
        .from("products")
        .update({
          stock: Math.max(0, (row.stock as number) - agg.totalQty),
          flavor_stock: nextFlavorStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (updErr) throw new Error(updErr.message);
    }
    return { ok: true };
  });
