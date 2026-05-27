import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Brand = "ignite" | "elfbar" | "blacksheep";

export interface Product {
  id: string;
  brand: Brand;
  name: string;
  description: string;
  price: number;
  image: string;
  stock: number;
  flavors: string[];
  flavorStock: Record<string, number>;
}

export interface CartItem {
  productId: string;
  flavor: string;
  qty: number;
}

export interface User {
  email: string;
  name: string;
  role?: "client" | "admin" | "courier";
}

export interface Courier {
  id: string;
  name: string;
  phone: string;
  email: string;
  pix: string;
  password: string;
  createdAt: number;
  approved: boolean;
}

export type OrderStatus = "pending" | "accepted" | "delivered" | "refused";

export interface OrderItem {
  productId: string;
  name: string;
  flavor?: string;
  qty: number;
  price: number;
}

export const DEFAULT_FLAVORS = ["Icy Mint", "Blueberry", "Strawberry", "Peach", "Watermelon"];

export interface ChatMessage {
  id: string;
  from: "client" | "admin" | "courier";
  text: string;
  createdAt: number;
}

export interface OrderProblem {
  reason: string;
  reportedAt: number;
  resolvedAt?: number;
  resolution?: string;
}

export interface Order {
  id: string;
  createdAt: number;
  acceptedAt?: number;
  customerName: string;
  customerEmail?: string;
  address: string;
  lat?: number;
  lng?: number;
  km?: number;
  payment: "pix" | "cartao" | "dinheiro";
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  courierEmail?: string;
  refusedBy?: string[];
  messages?: ChatMessage[];
  deliveryConfirmed?: boolean;
  rating?: number;
  ratingComment?: string;
  hiddenForCourier?: string[];
  withdrawnAt?: number;
  withdrawalId?: string;
  problem?: OrderProblem;
  feeFrozen?: boolean;
}

export interface Withdrawal {
  id: string;
  courierEmail: string;
  courierName: string;
  pix: string;
  pixType: "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM";
  amount: number; // reais
  orderIds: string[];
  createdAt: number;
  status: "pending" | "paid" | "failed";
  providerId?: string;
  receiptUrl?: string | null;
  error?: string;
}

export function detectPixType(raw: string): Withdrawal["pixType"] {
  const v = raw.trim();
  if (v.includes("@")) return "EMAIL";
  const digits = v.replace(/\D/g, "");
  if (digits.length === 11 && !v.startsWith("+") && !v.startsWith("(")) return "CPF";
  if (digits.length === 14) return "CNPJ";
  if (digits.length >= 10 && digits.length <= 13) return "PHONE";
  return "RANDOM";
}

const PRODUCTS_KEY = "azk_products_v2";
const CART_KEY = "azk_cart_v1";
const AUTH_KEY = "azk_auth_v1";
const USERS_KEY = "azk_users_v1";
const COURIERS_KEY = "azk_couriers_v1";
const ORDERS_KEY = "azk_orders_v1";
const WITHDRAWALS_KEY = "azk_withdrawals_v1";
const CUSTOMER_PROFILES_KEY = "azk_customer_profiles_v1";

export interface CustomerProfile {
  name: string;
  phone: string;
  email: string;
  cpf: string;
  street: string;
  number: string;
  neighborhood: string;
  complement: string;
  reference: string;
  updatedAt: number;
}

const EMPTY_PROFILE: CustomerProfile = {
  name: "",
  phone: "",
  email: "",
  cpf: "",
  street: "",
  number: "",
  neighborhood: "",
  complement: "",
  reference: "",
  updatedAt: 0,
};

export function useCustomerProfile(email?: string) {
  const key = email ? email.toLowerCase().trim() : "";
  const [profiles, setProfiles] = useStorage<Record<string, CustomerProfile>>(CUSTOMER_PROFILES_KEY, {});
  const profile = key ? profiles[key] : undefined;
  const save = (patch: Partial<CustomerProfile>) => {
    if (!key) return;
    const current = profiles[key] ?? EMPTY_PROFILE;
    const next = { ...profiles, [key]: { ...current, ...patch, email: key, updatedAt: Date.now() } };
    write(CUSTOMER_PROFILES_KEY, next);
    setProfiles(next);
  };
  const remove = () => {
    if (!key) return;
    const next = { ...profiles };
    delete next[key];
    write(CUSTOMER_PROFILES_KEY, next);
    setProfiles(next);
  };
  return { profile, hasProfile: !!profile && profile.updatedAt > 0, save, remove };
}

// Credenciais do admin (armazenadas localmente, editáveis no painel admin).
const ADMIN_CREDS_KEY = "azk_admin_creds_v1";
const DEFAULT_ADMIN_EMAIL = "admin@azkpods.com";
const DEFAULT_ADMIN_PASSWORD = "12345678";

interface AdminCreds {
  email: string;
  password: string;
}

function getAdminCreds(): AdminCreds {
  return read<AdminCreds>(ADMIN_CREDS_KEY, {
    email: DEFAULT_ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
  });
}

// Mantido para compatibilidade (default; o e-mail real vem de getAdminCreds()).
export const ADMIN_EMAIL = DEFAULT_ADMIN_EMAIL;

export function useAdminCredentials() {
  const [creds, setCreds] = useStorage<AdminCreds>(ADMIN_CREDS_KEY, {
    email: DEFAULT_ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
  });
  const update = (patch: Partial<AdminCreds>) => {
    const next: AdminCreds = {
      email: patch.email ? patch.email.toLowerCase().trim() : creds.email,
      password: patch.password !== undefined ? patch.password : creds.password,
    };
    write(ADMIN_CREDS_KEY, next);
    setCreds(next);
  };
  return { creds, update };
}

const defaultProducts: Product[] = (["ignite", "elfbar", "blacksheep"] as Brand[]).flatMap((brand) =>
  [1, 2, 3].map((i) => ({
    id: `${brand}-pod-${i}`,
    brand,
    name: `Pod ${i}`,
    description: "Edite a descrição e adicione uma foto do produto.",
    price: 45,
    image: "",
    stock: 50,
    flavors: [...DEFAULT_FLAVORS],
    flavorStock: Object.fromEntries(DEFAULT_FLAVORS.map((f) => [f, 10])) as Record<string, number>,
  })),
);

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("azk-storage", { detail: key }));
}

function useStorage<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setValue(read<T>(key, fallback));
    setHydrated(true);
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === key) setValue(read(key, fallback));
    };
    window.addEventListener("azk-storage", handler);
    return () => window.removeEventListener("azk-storage", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return [value, setValue, hydrated] as const;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  const load = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("position", { ascending: true });
    if (error) {
      console.error("loadProducts", error);
      return;
    }
    if (!data || data.length === 0) {
      // Seed defaults on first run
      try {
        await seedDefaultProducts();
      } catch (e) {
        console.error("seedProducts", e);
      }
      const { data: d2 } = await supabase
        .from("products")
        .select("*")
        .order("position", { ascending: true });
      if (d2) setProducts(d2.map(mapRow));
      return;
    }
    setProducts(data.map(mapRow));
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("products-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateProduct = async (id: string, patch: Partial<Product>) => {
    // Optimistic
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    await updateProductFn({ data: { id, patch: patch as Record<string, unknown> } });
  };

  const addStock = async (id: string, amount: number) => {
    const current = products.find((p) => p.id === id);
    if (!current) return;
    const next = Math.max(0, current.stock + amount);
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: next } : p)));
    await updateProductFn({ data: { id, patch: { stock: next } } });
  };

  const addFlavorStock = async (id: string, flavor: string, amount: number) => {
    const current = products.find((p) => p.id === id);
    if (!current) return;
    const nextFlavorStock = {
      ...current.flavorStock,
      [flavor]: Math.max(0, (current.flavorStock[flavor] ?? 0) + amount),
    };
    const nextStock = Math.max(0, current.stock + amount);
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stock: nextStock, flavorStock: nextFlavorStock } : p)),
    );
    await updateProductFn({
      data: { id, patch: { stock: nextStock, flavorStock: nextFlavorStock } },
    });
  };

  const addProduct = async (brand: Brand) => {
    await addProductFn({ data: { brand } });
    await load();
  };

  const removeProduct = async (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    await removeProductFn({ data: { id } });
  };

  const decrementStockForCart = async (cart: CartItem[]) => {
    if (cart.length === 0) return;
    await decrementStockFn({
      data: { items: cart.map((c) => ({ productId: c.productId, flavor: c.flavor, qty: c.qty })) },
    });
    await load();
  };

  return { products, updateProduct, addStock, addFlavorStock, addProduct, removeProduct, decrementStockForCart };
}

function mapRow(row: any): Product {
  const flavors: string[] =
    Array.isArray(row.flavors) && row.flavors.length > 0 ? row.flavors : [...DEFAULT_FLAVORS];
  const rawFs = (row.flavor_stock ?? {}) as Record<string, number>;
  const flavorStock: Record<string, number> = {};
  flavors.forEach((f) => {
    flavorStock[f] = typeof rawFs[f] === "number" ? rawFs[f] : 0;
  });
  return {
    id: row.id,
    brand: row.brand as Brand,
    name: row.name ?? "",
    description: row.description ?? "",
    price: Number(row.price ?? 0),
    image: row.image ?? "",
    stock: Number(row.stock ?? 0),
    flavors,
    flavorStock,
  };
}

export function useCart() {
  const [cart, setCartState] = useStorage<CartItem[]>(CART_KEY, []);

  const persist = (next: CartItem[]) => {
    write(CART_KEY, next);
    setCartState(next);
  };

  const sameLine = (c: CartItem, productId: string, flavor: string) => c.productId === productId && c.flavor === flavor;

  const add = (productId: string, flavor: string) => {
    const existing = cart.find((c) => sameLine(c, productId, flavor));
    persist(
      existing
        ? cart.map((c) => (sameLine(c, productId, flavor) ? { ...c, qty: c.qty + 1 } : c))
        : [...cart, { productId, flavor, qty: 1 }],
    );
  };

  const setQty = (productId: string, flavor: string, qty: number) => {
    persist(
      qty <= 0
        ? cart.filter((c) => !sameLine(c, productId, flavor))
        : cart.map((c) => (sameLine(c, productId, flavor) ? { ...c, qty } : c)),
    );
  };

  const clear = () => persist([]);

  const count = cart.reduce((s, c) => s + c.qty, 0);
  return { cart, add, setQty, clear, count };
}

// ============== Auth (local apenas) ==============

interface StoredUser extends User {
  password: string;
}

export function useAuth() {
  const [user, setUser, hydrated] = useStorage<User | null>(AUTH_KEY, null);

  const signup = (name: string, email: string, password: string) => {
    const users = read<StoredUser[]>(USERS_KEY, []);
    const lower = email.toLowerCase().trim();
    if (users.some((u) => u.email === lower)) {
      throw new Error("E-mail já cadastrado.");
    }
    const next = [...users, { name, email: lower, password, role: "client" as const }];
    write(USERS_KEY, next);
    const u: User = { name, email: lower, role: "client" };
    write(AUTH_KEY, u);
    setUser(u);
  };

  const login = (email: string, password: string) => {
    const lower = email.toLowerCase().trim();
    const admin = getAdminCreds();
    if (lower === admin.email.toLowerCase()) {
      if (!password) throw new Error("Informe a senha.");
      if (password !== admin.password) throw new Error("E-mail ou senha inválidos.");
      const u: User = { name: "Admin", email: lower, role: "admin" };
      write(AUTH_KEY, u);
      setUser(u);
      return u;
    }
    // Entregador aprovado
    const couriers = read<Courier[]>(COURIERS_KEY, []);
    const courier = couriers.find((c) => c.email.toLowerCase() === lower);
    if (courier) {
      if (!courier.approved) throw new Error("Seu cadastro de entregador ainda não foi aprovado.");
      if (courier.password !== password) throw new Error("E-mail ou senha inválidos.");
      const u: User = { name: courier.name, email: lower, role: "courier" };
      write(AUTH_KEY, u);
      setUser(u);
      return u;
    }
    // Cliente
    const users = read<StoredUser[]>(USERS_KEY, []);
    const found = users.find((u) => u.email === lower && u.password === password);
    if (!found) throw new Error("E-mail ou senha inválidos.");
    const u: User = { name: found.name, email: found.email, role: "client" };
    write(AUTH_KEY, u);
    setUser(u);
    return u;
  };

  const logout = () => {
    write(AUTH_KEY, null);
    setUser(null);
  };

  const isAdmin = !!user && user.email.toLowerCase() === getAdminCreds().email.toLowerCase();
  const isCourier = !!user && user.role === "courier";
  return { user, isAdmin, isCourier, hydrated, login, logout, signup };
}

// ============== Entregadores ==============

export function useCouriers() {
  const [couriers, setCouriers] = useStorage<Courier[]>(COURIERS_KEY, []);

  const add = (data: Omit<Courier, "id" | "createdAt" | "approved">) => {
    const next: Courier[] = [...couriers, { ...data, id: `c-${Date.now()}`, createdAt: Date.now(), approved: false }];
    write(COURIERS_KEY, next);
    setCouriers(next);
  };

  const approve = (id: string) => {
    const next = couriers.map((c) => (c.id === id ? { ...c, approved: true } : c));
    write(COURIERS_KEY, next);
    setCouriers(next);
  };

  const remove = (id: string) => {
    const next = couriers.filter((c) => c.id !== id);
    write(COURIERS_KEY, next);
    setCouriers(next);
  };

  return { couriers, add, approve, remove };
}

// ============== Pedidos ==============

export function useOrders() {
  const [orders, setOrders, hydrated] = useStorage<Order[]>(ORDERS_KEY, []);

  const persist = (next: Order[]) => {
    write(ORDERS_KEY, next);
    setOrders(next);
  };

  const create = (data: Omit<Order, "id" | "createdAt" | "status" | "courierEmail">) => {
    const order: Order = {
      ...data,
      id: `o-${Date.now()}`,
      createdAt: Date.now(),
      status: "pending",
    };
    persist([order, ...orders]);
    return order;
  };

  const accept = (id: string, courierEmail: string) => {
    persist(
      orders.map((o) => (o.id === id && o.status === "pending" ? { ...o, status: "accepted", courierEmail } : o)),
    );
  };

  const deliver = (id: string) => {
    persist(orders.map((o) => (o.id === id ? { ...o, status: "delivered" } : o)));
  };

  const addMessage = (id: string, from: "client" | "admin" | "courier", text: string) => {
    persist(
      orders.map((o) =>
        o.id === id
          ? {
              ...o,
              messages: [...(o.messages ?? []), { id: `m-${Date.now()}`, from, text, createdAt: Date.now() }],
            }
          : o,
      ),
    );
  };

  const reportProblem = (id: string, reason: string) => {
    persist(
      orders.map((o) =>
        o.id === id
          ? {
              ...o,
              feeFrozen: true,
              problem: { reason, reportedAt: Date.now() },
              messages: [
                ...(o.messages ?? []),
                { id: `m-${Date.now()}`, from: "courier", text: `⚠️ Problema reportado: ${reason}`, createdAt: Date.now() },
              ],
            }
          : o,
      ),
    );
  };

  const releaseFee = (id: string, resolution?: string) => {
    persist(
      orders.map((o) =>
        o.id === id
          ? {
              ...o,
              feeFrozen: false,
              problem: o.problem ? { ...o.problem, resolvedAt: Date.now(), resolution } : o.problem,
              messages: [
                ...(o.messages ?? []),
                {
                  id: `m-${Date.now()}`,
                  from: "admin",
                  text: `✅ Valor liberado pelo admin${resolution ? `: ${resolution}` : "."}`,
                  createdAt: Date.now(),
                },
              ],
            }
          : o,
      ),
    );
  };

  const confirmDelivery = (id: string, success: boolean) => {
    persist(orders.map((o) => (o.id === id ? { ...o, deliveryConfirmed: success } : o)));
  };

  const rate = (id: string, rating: number, comment?: string) => {
    persist(orders.map((o) => (o.id === id ? { ...o, rating, ratingComment: comment } : o)));
  };

  const refuse = (id: string, courierEmail: string) => {
    persist(
      orders.map((o) =>
        o.id === id
          ? {
              ...o,
              status: "refused",
              refusedBy: [...(o.refusedBy ?? []), courierEmail],
            }
          : o,
      ),
    );
  };

  const clearCourierHistory = (courierEmail: string) => {
    persist(
      orders.map((o) =>
        o.courierEmail === courierEmail && o.status === "delivered"
          ? {
              ...o,
              hiddenForCourier: [...(o.hiddenForCourier ?? []), courierEmail],
            }
          : o,
      ),
    );
  };

  const markWithdrawn = (orderIds: string[], withdrawalId: string) => {
    const set = new Set(orderIds);
    const ts = Date.now();
    persist(
      orders.map((o) =>
        set.has(o.id) ? { ...o, withdrawnAt: ts, withdrawalId } : o,
      ),
    );
  };

  return { orders, hydrated, create, accept, deliver, refuse, clearCourierHistory, addMessage, confirmDelivery, rate, markWithdrawn, reportProblem, releaseFee };
}

export function useWithdrawals() {
  const [withdrawals, setWithdrawals] = useStorage<Withdrawal[]>(WITHDRAWALS_KEY, []);

  const persist = (next: Withdrawal[]) => {
    write(WITHDRAWALS_KEY, next);
    setWithdrawals(next);
  };

  const add = (w: Withdrawal) => persist([w, ...withdrawals]);

  const update = (id: string, patch: Partial<Withdrawal>) => {
    persist(withdrawals.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };

  return { withdrawals, add, update };
}

// Delivery: R$5 até 5km. De 5 a 10km: +R$1/km. Acima de 10km: +R$0,50/km.
export function calcDelivery(km: number): number {
  if (km <= 0) return 0;
  if (km <= 5) return 5;
  if (km <= 10) return 5 + (km - 5) * 1;
  return 5 + 5 * 1 + (km - 10) * 0.5;
}
