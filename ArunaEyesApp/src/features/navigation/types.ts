export type LatLng = [number, number];

export type BackendRoutePoint = {
  lat: number;
  lng: number;
};

export type BackendRouteStep = {
  index: number;
  instruction: string;
  rawInstruction?: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuver: {
    type: string;
    lat: number;
    lng: number;
  };
  voiceHint: string;
};

export type RouteStep = {
  id: string;
  instruction: string;
  distance: string;
  duration: string;
  voiceHint?: string;
  maneuver?: {
    type: string;
    lat: number;
    lng: number;
  };
  distanceMeters?: number;
  durationSeconds?: number;
};

export type RouteResult = {
  from: string;
  to: string;
  totalDistance: string;
  totalDuration: string;
  steps: RouteStep[];
  fromCoord?: LatLng;
  toCoord?: LatLng;
  geometry?: LatLng[];
  offRoute?: boolean;
};

export type BuildRouteResponse = {
  type: "BUILD_ROUTE";
  text: string;
  route: {
    name: string;
    start: BackendRoutePoint;
    end: BackendRoutePoint;
    geometry: BackendRoutePoint[];
    steps: BackendRouteStep[];
    totalDistanceMeters: number;
    totalDurationSeconds: number;
    firstInstruction: string | null;
    firstVoiceHint: string | null;
  };
};

export type ViewMode = "map" | "steps" | "glasses";