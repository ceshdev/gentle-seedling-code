import { createServerFn } from "@tanstack/react-start";

const STORE_LAT = -16.6864;
const STORE_LNG = -49.2643;

export type OrderRoute = {
  polyline: string;
  distanceMeters: number;
  durationSeconds: number;
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  courier?: { lat: number; lng: number } | null;
};

export const getOrderRoute = createServerFn({ method: "POST" })
  .inputValidator((data: { lat: number; lng: number }) => {
    if (typeof data?.lat !== "number" || typeof data?.lng !== "number") {
      throw new Error("Coordenadas inválidas");
    }
    return data;
  })
  .handler(async ({ data }): Promise<OrderRoute> => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");
    if (!GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY ausente");

    const res = await fetch(
      "https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
          "Content-Type": "application/json",
          "X-Goog-FieldMask": "routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: STORE_LAT, longitude: STORE_LNG } } },
          destination: { location: { latLng: { latitude: data.lat, longitude: data.lng } } },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
        }),
      },
    );
    const json = await res.json();
    if (!res.ok || !json.routes?.[0]) {
      throw new Error(`Falha ao calcular rota: ${JSON.stringify(json)}`);
    }
    const r = json.routes[0];
    const duration = typeof r.duration === "string" ? parseInt(r.duration) : Number(r.duration ?? 0);
    return {
      polyline: r.polyline.encodedPolyline,
      distanceMeters: Number(r.distanceMeters ?? 0),
      durationSeconds: duration || 0,
      origin: { lat: STORE_LAT, lng: STORE_LNG },
      destination: { lat: data.lat, lng: data.lng },
      courier: null,
    };
  });
