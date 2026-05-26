/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bike, Clock, MapPin, Store } from "lucide-react";
import { getOrderRoute } from "@/lib/route.functions";
import type { Order } from "@/lib/store";

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as
  | string
  | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as
  | string
  | undefined;

declare global {
  interface Window {
    google?: typeof google;
    __azkMapsInit?: () => void;
    __azkMapsReady?: Promise<void>;
  }
}

function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (window.__azkMapsReady) return window.__azkMapsReady;
  if (!BROWSER_KEY) return Promise.reject(new Error("Google Maps key missing"));

  window.__azkMapsReady = new Promise<void>((resolve, reject) => {
    window.__azkMapsInit = () => resolve();
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key: BROWSER_KEY,
      loading: "async",
      callback: "__azkMapsInit",
      libraries: "geometry",
    });
    if (TRACKING_ID) params.set("channel", TRACKING_ID);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
    document.head.appendChild(s);
  });
  return window.__azkMapsReady;
}

// Decoder for Google encoded polyline format.
function decodePolyline(str: string): Array<{ lat: number; lng: number }> {
  let index = 0, lat = 0, lng = 0;
  const coords: Array<{ lat: number; lng: number }> = [];
  while (index < str.length) {
    let b: number, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coords;
}

function fmtEta(sec: number) {
  const m = Math.max(0, Math.round(sec / 60));
  if (m <= 0) return "chegando";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}min` : `${h}h`;
}

export function MapRouteView({
  order,
  mode,
}: {
  order: Order;
  mode: "courier" | "client";
}) {
  const fetchRoute = useServerFn(getOrderRoute);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const courierMarkerRef = useRef<google.maps.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [, force] = useState(0);

  const { data, error } = useQuery({
    queryKey: ["order-route", order.id, order.lat, order.lng],
    queryFn: () => fetchRoute({ data: { lat: order.lat!, lng: order.lng! } }),
    enabled: order.lat != null && order.lng != null,
    staleTime: 60_000,
  });

  // tick every 20s to advance courier position
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 20_000);
    return () => clearInterval(t);
  }, []);

  // init map
  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        mapRef.current = new window.google.maps.Map(containerRef.current, {
          center: { lat: order.lat ?? -16.68, lng: order.lng ?? -49.26 },
          zoom: 14,
          disableDefaultUI: true,
          gestureHandling: "cooperative",
          clickableIcons: false,
          styles: darkMapStyle,
        });
        setReady(true);
      })
      .catch(() => setReady(false));
    return () => { cancelled = true; };
  }, [order.lat, order.lng]);

  // draw route
  useEffect(() => {
    if (!ready || !data || !mapRef.current || !window.google) return;
    const map = mapRef.current;
    const path = decodePolyline(data.polyline);
    if (path.length < 2) return;

    // For client view, hide pickup half of the route for privacy.
    const visiblePath = mode === "courier" ? path : path.slice(Math.floor(path.length / 2));

    const poly = new window.google.maps.Polyline({
      path: visiblePath,
      geodesic: false,
      strokeColor: "#a855f7",
      strokeOpacity: 0.95,
      strokeWeight: 5,
      map,
    });

    const markers: google.maps.Marker[] = [];

    if (mode === "courier") {
      markers.push(new window.google.maps.Marker({
        position: path[0],
        map,
        label: { text: "🏪", fontSize: "18px" },
        title: "Coleta",
      }));
    }
    markers.push(new window.google.maps.Marker({
      position: path[path.length - 1],
      map,
      label: { text: "📍", fontSize: "20px" },
      title: "Entrega",
    }));

    // courier moving marker
    const elapsed = order.acceptedAt ? (Date.now() - order.acceptedAt) / 1000 : 0;
    const progress = Math.min(0.98, Math.max(0.02, elapsed / Math.max(60, data.durationSeconds)));
    const startT = mode === "courier" ? 0 : 0.5;
    const t = startT + progress * (1 - startT);
    const idx = Math.min(path.length - 1, Math.floor(t * (path.length - 1)));

    courierMarkerRef.current = new window.google.maps.Marker({
      position: path[idx],
      map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#ffffff",
        fillOpacity: 1,
        strokeColor: "#a855f7",
        strokeWeight: 3,
      },
      title: "Entregador",
      zIndex: 999,
    });

    // fit bounds to visible content
    const bounds = new window.google.maps.LatLngBounds();
    visiblePath.forEach((p) => bounds.extend(p));
    bounds.extend(path[idx]);
    map.fitBounds(bounds, { top: 30, right: 30, bottom: 30, left: 30 });

    return () => {
      poly.setMap(null);
      markers.forEach((m) => m.setMap(null));
      courierMarkerRef.current?.setMap(null);
      courierMarkerRef.current = null;
    };
  }, [ready, data, mode, order.acceptedAt]);

  const elapsed = order.acceptedAt ? (Date.now() - order.acceptedAt) / 1000 : 0;
  const remaining = data ? Math.max(0, data.durationSeconds - elapsed) : 0;

  return (
    <div className="rounded-xl border border-border/60 bg-secondary/30 overflow-hidden">
      <div className="px-3 pt-3 pb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-brand-glow">
          <Bike className="w-3.5 h-3.5" />
          {mode === "courier" ? "Rota da entrega" : "A caminho"}
        </span>
        {data && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {mode === "courier" ? `${fmtEta(remaining)} restantes` : `Chega em ~${fmtEta(remaining)}`}
          </span>
        )}
      </div>

      <div className="relative">
        <div ref={containerRef} className="w-full h-56 bg-secondary/40" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            {error ? "Mapa indisponível" : "Carregando mapa…"}
          </div>
        )}
        {mode === "courier" && (
          <div className="absolute left-2 bottom-2 flex items-center gap-1 bg-background/85 backdrop-blur px-1.5 py-0.5 rounded text-[10px] font-semibold">
            <Store className="w-3 h-3 text-primary" /> Coleta
          </div>
        )}
        <div className="absolute right-2 bottom-2 flex items-center gap-1 bg-background/85 backdrop-blur px-1.5 py-0.5 rounded text-[10px] font-semibold">
          <MapPin className="w-3 h-3 text-primary" /> Entrega
        </div>
      </div>

      <div className="px-3 py-2 border-t border-border/40 grid grid-cols-2 gap-2 text-[11px]">
        {mode === "courier" ? (
          <>
            <Info label="Endereço" value={order.address} />
            <Info
              label="Distância"
              value={data ? `${(data.distanceMeters / 1000).toFixed(1)} km` : order.km ? `${order.km} km` : "—"}
            />
          </>
        ) : (
          <>
            <Info label="Status" value="Entregador a caminho" />
            <Info label="Tempo estimado" value={data ? fmtEta(remaining) : "calculando…"} />
          </>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-semibold truncate">{value}</p>
    </div>
  );
}

// Dark map style to match the app's aesthetic.
const darkMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1a24" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a24" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a99" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a38" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#33334a" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3d3d5c" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f1420" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#1f1f2c" }] },
];
