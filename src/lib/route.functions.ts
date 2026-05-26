// Frontend-only stub.
export type OrderRoute = {
  polyline: string;
  distanceMeters: number;
  durationSeconds: number;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  courier?: { lat: number; lng: number } | null;
};

export async function getOrderRoute(_input: unknown): Promise<OrderRoute> {
  throw new Error("Backend não conectado: getOrderRoute indisponível no clone do front.");
}
