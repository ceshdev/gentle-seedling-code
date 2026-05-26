// Frontend-only stub. Conecte um backend para habilitar a cotação real.
type AddressInput = {
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  reference?: string;
  city?: string;
  address?: string;
};

export async function quoteDelivery(_input: { data: AddressInput } | AddressInput) {
  throw new Error("Backend não conectado: quoteDelivery indisponível no clone do front.");
  // eslint-disable-next-line no-unreachable
  return { lat: 0, lng: 0, km: 0, fee: 0, displayName: "", resolved: "" };
}
