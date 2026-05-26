import { createServerFn } from "@tanstack/react-start";

// Loja de origem (centro de Goiânia). Ajuste se necessário.
const STORE_LAT = -16.6864;
const STORE_LNG = -49.2643;
const BASE_FEE = 5;
const PER_KM = 2;
const MIN_FEE = 7;

type AddressInput = {
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  reference?: string;
  city?: string;
};

function gatewayHeaders() {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");
  if (!GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY ausente");
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
  };
}

export const quoteDelivery = createServerFn({ method: "POST" })
  .inputValidator((data: AddressInput) => data)
  .handler(async ({ data }) => {
    const parts = [
      [data.street, data.number].filter(Boolean).join(", "),
      data.neighborhood,
      data.city || "Goiânia",
      "GO, Brasil",
    ].filter(Boolean);
    const address = parts.join(" - ");

    const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

    // 1) Geocoding
    const geoRes = await fetch(
      `${GATEWAY}/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=br`,
      { headers: gatewayHeaders() },
    );
    const geo = await geoRes.json();
    if (!geoRes.ok || geo.status !== "OK" || !geo.results?.[0]) {
      throw new Error(`Endereço não encontrado (${geo.status || geoRes.status})`);
    }
    const r0 = geo.results[0];
    const lat = r0.geometry.location.lat as number;
    const lng = r0.geometry.location.lng as number;
    const displayName = r0.formatted_address as string;

    // 2) Distância via Routes API computeRouteMatrix
    const matrixRes = await fetch(`${GATEWAY}/routes/distanceMatrix/v2:computeRouteMatrix`, {
      method: "POST",
      headers: {
        ...gatewayHeaders(),
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "originIndex,destinationIndex,distanceMeters,duration,status",
      },
      body: JSON.stringify({
        origins: [{ waypoint: { location: { latLng: { latitude: STORE_LAT, longitude: STORE_LNG } } } }],
        destinations: [{ waypoint: { location: { latLng: { latitude: lat, longitude: lng } } } }],
        travelMode: "DRIVE",
      }),
    });
    const matrix = await matrixRes.json();
    if (!matrixRes.ok) {
      throw new Error(`Erro ao calcular rota: ${JSON.stringify(matrix)}`);
    }
    const entry = Array.isArray(matrix) ? matrix[0] : matrix;
    const meters = Number(entry?.distanceMeters ?? 0);
    if (!meters) throw new Error("Não foi possível calcular a distância");

    const km = Math.max(0.1, +(meters / 1000).toFixed(1));
    const fee = Math.max(MIN_FEE, +(BASE_FEE + PER_KM * km).toFixed(2));

    return {
      lat,
      lng,
      km,
      fee,
      displayName,
      resolved: displayName,
    };
  });
