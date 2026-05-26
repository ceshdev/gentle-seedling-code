// Frontend-only stub. Conecte um backend para habilitar pagamentos PIX.
export async function createPixQrCode(_input: unknown): Promise<never> {
  throw new Error("Backend não conectado: createPixQrCode indisponível no clone do front.");
}

export async function checkPixStatus(_input: unknown): Promise<never> {
  throw new Error("Backend não conectado: checkPixStatus indisponível no clone do front.");
}
