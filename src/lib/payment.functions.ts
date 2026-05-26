import { createServerFn } from "@tanstack/react-start";

const API = "https://api.abacatepay.com/v1";

export type PixStatus = {
  status: string;
};

export type PixQrCode = {
  id: string;
  brCode: string;
  brCodeBase64: string;
  status: string;
  amount: number;
  expiresAt: string;
};

function authHeader() {
  const key = process.env.ABACATEPAY_API_KEY;
  if (!key) throw new Error("ABACATEPAY_API_KEY ausente");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

type CreateInput = {
  amount: number; // cents
  description?: string;
  customer: { name: string; email: string; cellphone: string; taxId: string };
};

export const createPixQrCode = createServerFn({ method: "POST" })
  .inputValidator((data: CreateInput) => {
    if (!data?.amount || data.amount < 100) throw new Error("Valor inválido");
    if (!data.customer?.name || !data.customer?.taxId) throw new Error("Dados do pagador incompletos");
    return data;
  })
  .handler(async ({ data }): Promise<PixQrCode> => {
    const res = await fetch(`${API}/pixQrCode/create`, {
      method: "POST",
      headers: authHeader(),
      body: JSON.stringify({
        amount: data.amount,
        expiresIn: 60 * 15,
        description: data.description ?? "Pedido AZk pods",
        customer: data.customer,
      }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(`Abacate Pay: ${json.error?.message || json.message || res.status}`);
    }
    const d = json.data ?? json;
    return {
      id: d.id,
      brCode: d.brCode,
      brCodeBase64: d.brCodeBase64,
      status: d.status,
      amount: d.amount,
      expiresAt: d.expiresAt,
    };
  });

export const checkPixStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("id obrigatório");
    return data;
  })
  .handler(async ({ data }): Promise<PixStatus> => {
    const res = await fetch(`${API}/pixQrCode/check?id=${encodeURIComponent(data.id)}`, {
      headers: authHeader(),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(`Abacate Pay: ${json.error?.message || json.message || res.status}`);
    }
    const d = json.data ?? json;
    return { status: String(d.status ?? "PENDING") };
  });
