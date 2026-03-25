import type { BuildRouteResponse, LatLng, RouteResult } from "./types";

const API_BASE =
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ??
  "http://localhost:4000/api";

type CityMode = "astana" | "almaty" | "any";

type BuildRoutePayload = {
  from: string;
  to: string;
  fromCoord?: LatLng;
  cityMode?: CityMode;
};

function formatMeters(meters: number) {
  if (meters < 1000) {
    return `${Math.round(meters)} м`;
  }

  const km = meters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} км`;
}

export async function reverseGeocode(lat: number, lon: number) {
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;

  const url = new URL("https://api.geoapify.com/v1/geocode/reverse");

  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("apiKey", apiKey);

  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error("Не удалось определить адрес");
  }

  const data = await res.json();
  const result = data?.results?.[0];

  if (!result) return null;

  return {
    street: result.street,
    housenumber: result.housenumber,
    name: result.name,
    city: result.city,
  };
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);

  if (minutes < 60) {
    return `${minutes} мин`;
  }

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  if (!restMinutes) {
    return `${hours} ч`;
  }

  return `${hours} ч ${restMinutes} мин`;
}

function getCityLabel(cityMode: CityMode) {
  switch (cityMode) {
    case "astana":
      return "Астана, Казахстан";
    case "almaty":
      return "Алматы, Казахстан";
    default:
      return "Казахстан";
  }
}

function buildSearchText(query: string, cityMode: CityMode) {
  const trimmed = query.trim();
  if (!trimmed) return trimmed;

  const cityLabel = getCityLabel(cityMode);

  const lower = trimmed.toLowerCase();
  if (
    lower.includes("астана") ||
    lower.includes("алматы") ||
    lower.includes("казахстан")
  ) {
    return trimmed;
  }

  return `${trimmed}, ${cityLabel}`;
}

async function geocodePlace(
  query: string,
  cityMode: CityMode = "any",
): Promise<LatLng | null> {
  const url = new URL("https://api.geoapify.com/v1/geocode/search");

  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
  if (!apiKey) {
    throw new Error("Не задан VITE_GEOAPIFY_API_KEY во фронтенд .env");
  }

  url.searchParams.set("text", buildSearchText(query, cityMode));
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("filter", "countrycode:kz");
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error("Не удалось найти адрес.");
  }

  const data = await response.json();
  const item = data?.results?.[0];

  if (!item) {
    return null;
  }

  return [Number(item.lat), Number(item.lon)];
}

function mapBackendRouteToFrontend(
  data: BuildRouteResponse,
  from: string,
  to: string,
): RouteResult {
  return {
    from,
    to,
    totalDistance: formatMeters(data.route.totalDistanceMeters),
    totalDuration: formatDuration(data.route.totalDurationSeconds),
    fromCoord: [data.route.start.lat, data.route.start.lng],
    toCoord: [data.route.end.lat, data.route.end.lng],
    geometry: data.route.geometry.map((point) => [point.lat, point.lng]),
    steps: data.route.steps.map((step) => ({
      id: String(step.index),
      instruction: step.instruction,
      distance: formatMeters(step.distanceMeters),
      duration: formatDuration(step.durationSeconds),
      voiceHint: step.voiceHint,
      maneuver: step.maneuver,
      distanceMeters: step.distanceMeters,
      durationSeconds: step.durationSeconds,
    })),
  };
}

export async function buildBackendRoute(params: BuildRoutePayload) {
  const {
    from,
    to,
    fromCoord,
    cityMode = "any",
  } = params;

  const start = fromCoord ?? (await geocodePlace(from, cityMode));
  if (!start) {
    throw new Error("Не удалось определить точку отправления.");
  }

  const end = await geocodePlace(to, cityMode);
  if (!end) {
    throw new Error("Не удалось определить точку назначения.");
  }

  const response = await fetch(`${API_BASE}/route/build`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startLatitude: start[0],
      startLongitude: start[1],
      endLatitude: end[0],
      endLongitude: end[1],
      destinationName: to,
    }),
  });

  if (!response.ok) {
    let message = "Не удалось построить маршрут через backend.";

    try {
      const errorData = await response.json();
      if (errorData?.message) {
        message = Array.isArray(errorData.message)
          ? errorData.message.join(", ")
          : errorData.message;
      }
    } catch {
      // ignore
    }

    throw new Error(message);
  }

  const data = (await response.json()) as BuildRouteResponse;

  return mapBackendRouteToFrontend(data, from, to);
}