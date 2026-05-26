// Frontend-only stub.
export type PixStatus = {
  status: "PENDING" | "PAID" | "EXPIRED" | "CANCELLED" | string;
  [k: string]: unknown;
};
export type PixQrCode = {
  id: string;
  brCode: string;
  brCodeBase64: string;
  status: string;
  amount: number;
  expiresAt: string;
  [k: string]: unknown;
};

export async function createPixQrCode(_input: unknown): Promise<PixQrCode> {
  throw new Error("Backend não conectado: createPixQrCode indisponível no clone do front.");
}

export async function checkPixStatus(_input: unknown): Promise<PixStatus> {
  throw new Error("Backend não conectado: checkPixStatus indisponível no clone do front.");
}
