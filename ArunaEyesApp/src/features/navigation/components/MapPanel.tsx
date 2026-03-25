import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { LatLng, RouteResult } from "../types";

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    map.fitBounds(points, { padding: [24, 24] });
  }, [map, points]);

  return null;
}

function createUserIcon(heading: number | null) {
  const rotation = heading ?? 0;

  return L.divIcon({
    className: "custom-user-heading-icon",
    html: `
      <div style="
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-bottom: 20px solid #2563eb;
          transform: rotate(${rotation}deg);
          transform-origin: center center;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.35));
        "></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function MapPanel({
  route,
  userCoord,
  userAddress,
  activeManeuver,
  heading,
}: {
  route: RouteResult | null;
  userCoord?: LatLng | null;
  userAddress?: string | null;
  activeManeuver?: LatLng | null;
  heading?: number | null;
}) {
  const center = useMemo<LatLng>(() => {
    if (userCoord) return userCoord;
    if (route?.fromCoord) return route.fromCoord;
    return [43.2389, 76.8897];
  }, [route?.fromCoord, userCoord]);

  const pointsToFit = useMemo(() => {
    const pts: LatLng[] = [];

    if (route?.fromCoord) pts.push(route.fromCoord);
    if (route?.toCoord) pts.push(route.toCoord);
    if (route?.geometry?.length) pts.push(...route.geometry);
    if (userCoord) pts.push(userCoord);
    if (activeManeuver) pts.push(activeManeuver);

    return pts;
  }, [route?.fromCoord, route?.toCoord, route?.geometry, userCoord, activeManeuver]);

  const routeColor = route?.offRoute ? "red" : "blue";

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-slate-900">Карта</h3>
        <p className="text-sm text-slate-500">
          {route
            ? route.offRoute
              ? "Обнаружено отклонение от маршрута"
              : "Маршрут построен"
            : "Постройте маршрут, чтобы увидеть его на карте"}
        </p>

        {route ? (
          <p className="mt-1 text-sm font-medium text-slate-700">
            {route.totalDistance} · {route.totalDuration}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
        <MapContainer
          center={center}
          zoom={15}
          style={{ height: 420, width: "100%" }}
          scrollWheelZoom
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {route?.fromCoord ? (
            <Marker position={route.fromCoord}>
              <Popup>Откуда: {route.from}</Popup>
            </Marker>
          ) : null}

          {route?.toCoord ? (
            <Marker position={route.toCoord}>
              <Popup>Куда: {route.to}</Popup>
            </Marker>
          ) : null}

          {userCoord ? (
            <Marker position={userCoord} icon={createUserIcon(heading ?? null)}>
              <Popup>
                Вы здесь{userAddress ? `: ${userAddress}` : ""}
                {typeof heading === "number" ? ` · направление: ${Math.round(heading)}°` : ""}
              </Popup>
            </Marker>
          ) : null}

          {activeManeuver ? (
            <CircleMarker center={activeManeuver} radius={10}>
              <Popup>Следующий манёвр</Popup>
            </CircleMarker>
          ) : null}

          {route?.geometry?.length ? (
            <Polyline positions={route.geometry} pathOptions={{ color: routeColor, weight: 5 }} />
          ) : null}

          {pointsToFit.length ? <FitBounds points={pointsToFit} /> : null}
        </MapContainer>
      </div>
    </section>
  );
}