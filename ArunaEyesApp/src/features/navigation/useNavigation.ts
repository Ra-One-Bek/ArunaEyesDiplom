import { useEffect, useMemo, useRef, useState } from "react";
import { reverseGeocode, buildBackendRoute } from "./navigationApi";
import { speakRu, stopSpeak } from "./tts";
import type { LatLng, RouteResult, ViewMode } from "./types";

function distanceMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) *
      Math.sin(dLng / 2) *
      Math.cos(lat1) *
      Math.cos(lat2);

  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * y;
}

function distanceToPolyline(point: LatLng, line: LatLng[]) {
  if (!line.length) return Number.POSITIVE_INFINITY;

  let min = Number.POSITIVE_INFINITY;

  for (const routePoint of line) {
    const dist = distanceMeters(point, routePoint);
    if (dist < min) min = dist;
  }

  return min;
}

function buildDistanceVoice(text: string, meters: number) {
  if (meters <= 8) {
    return text;
  }

  if (meters <= 25) {
    return `Скоро ${text.toLowerCase()}`;
  }

  if (meters <= 80) {
    return `Через ${Math.round(meters)} метров ${text.toLowerCase()}`;
  }

  return `Продолжайте движение`;
}

export function useNavigation() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [cityMode, setCityMode] = useState<"astana" | "almaty" | "any">("astana");
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [view, setView] = useState<ViewMode>("map");
  const [error, setError] = useState<string | null>(null);
  const [userCoord, setUserCoord] = useState<LatLng | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [distanceToNextManeuver, setDistanceToNextManeuver] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [voiceOnlyMode, setVoiceOnlyMode] = useState(false);

  const lastSpokenStepRef = useRef<number | null>(null);
  const lastPromptAtRef = useRef<number>(0);
  const offRouteCounterRef = useRef(0);
  const lastOffRouteAtRef = useRef(0);
  const lastRebuildAtRef = useRef(0);
  const lastContinueAtRef = useRef(0);

  const canBuild = from.trim().length > 0 && to.trim().length > 0;

  const patchRoute = (patch: Partial<RouteResult>) => {
    setRoute((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const activeStep = useMemo(() => {
    if (!route) return null;
    return route.steps[Math.min(activeStepIndex, route.steps.length - 1)] ?? null;
  }, [route, activeStepIndex]);

  const activeManeuver = useMemo(() => {
    if (!activeStep?.maneuver) return null;
    return [activeStep.maneuver.lat, activeStep.maneuver.lng] as LatLng;
  }, [activeStep]);

  const buildRouteFromValues = async (
    nextFrom: string,
    nextTo: string,
    fromCoord?: LatLng,
  ) => {
    setError(null);

    const trimmedFrom = nextFrom.trim();
    const trimmedTo = nextTo.trim();

    if (!trimmedFrom || !trimmedTo) {
      setError("Заполните поля 'Откуда' и 'Куда'.");
      return;
    }

    
    

    setFrom(trimmedFrom);
    setTo(trimmedTo);
    setIsBuilding(true);

    try {
      const result = await buildBackendRoute({
        from: trimmedFrom,
        to: trimmedTo,
        fromCoord,
        cityMode,
      });

      setRoute({
        ...result,
        offRoute: false,
      });

      if (voiceOnlyMode) {
        setIsNavigating(true);

        const first = result?.steps?.[0];
        if (first) {
          speakRu(`Маршрут построен. ${first.voiceHint ?? first.instruction}`);
        }
      }

      setActiveStepIndex(0);
      setDistanceToNextManeuver(null);
      setView("steps");

      lastSpokenStepRef.current = null;
      offRouteCounterRef.current = 0;

      return result;
    } catch (err: any) {
      setError(err?.message ?? "Не удалось построить маршрут.");
      return null;
    } finally {
      setIsBuilding(false);
    }
  };

  const buildRoute = async () => {
    setIsNavigating(false);
    await buildRouteFromValues(from, to);
  };

  const rebuildRouteFromCurrentPosition = async (current: LatLng) => {
    if (!route) return;

    const now = Date.now();

    if (now - lastRebuildAtRef.current < 15000) {
      return;
    }

    lastRebuildAtRef.current = now;

    try {
      speakRu("Перестраиваю маршрут");

      const rebuilt = await buildRouteFromValues("Мое местоположение", route.to, current);

      if (rebuilt) {
        setIsNavigating(true);
        setActiveStepIndex(0);

        const firstStep = rebuilt.steps[0];
        if (firstStep) {
          speakRu(firstStep.voiceHint ?? firstStep.instruction);
          lastSpokenStepRef.current = 0;
          lastPromptAtRef.current = Date.now();
        }
      }
    } catch (e) {
      console.error("Rebuild route error:", e);
    }
  };

  const start = () => {
    setError(null);

    if (!route) {
      setError("Сначала постройте маршрут.");
      return;
    }

    setIsNavigating(true);
    setView("steps");

    const first = route.steps[0];
    if (first) {
      speakRu(`Маршрут построен. ${first.voiceHint ?? first.instruction}`);
      lastSpokenStepRef.current = 0;
      lastPromptAtRef.current = Date.now();
    }
  };

  const speakStep = () => {
    setError(null);

    if (!route) {
      setError("Сначала постройте маршрут.");
      return;
    }

    const step = route.steps[activeStepIndex];
    if (!step?.maneuver) {
      const now = Date.now();

      if (now - lastContinueAtRef.current > 15000) {
        speakRu("Продолжайте движение прямо");
        lastContinueAtRef.current = now;
      }

      return;
    }

    if (step) {
      const phrase =
        distanceToNextManeuver !== null
          ? buildDistanceVoice(step.voiceHint ?? step.instruction, distanceToNextManeuver)
          : step.voiceHint ?? step.instruction;

      speakRu(phrase);
      lastPromptAtRef.current = Date.now();
    }
  };

  const next = () => {
    if (!route) return;

    const idx = Math.min(activeStepIndex + 1, route.steps.length - 1);
    setActiveStepIndex(idx);

    const step = route.steps[idx];
    if (isNavigating && step) {
      speakRu(step.voiceHint ?? step.instruction);
      lastSpokenStepRef.current = idx;
      lastPromptAtRef.current = Date.now();
    }
  };

  const prev = () => {
    if (!route) return;

    const idx = Math.max(activeStepIndex - 1, 0);
    setActiveStepIndex(idx);

    const step = route.steps[idx];
    if (isNavigating && step) {
      speakRu(step.voiceHint ?? step.instruction);
      lastSpokenStepRef.current = idx;
      lastPromptAtRef.current = Date.now();
    }
  };

  const stop = () => {
    setIsNavigating(false);
    stopSpeak();
  };

  const whereAmI = async () => {
    if (!("geolocation" in navigator)) {
      setError("Геолокация не поддерживается.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        setUserCoord([lat, lon]);

        if (typeof pos.coords.heading === "number" && !Number.isNaN(pos.coords.heading)) {
          setHeading(pos.coords.heading);
        }

        try {
          const place = await reverseGeocode(lat, lon);

          let text = "";

          if (place?.name) {
            text = `Вы находитесь рядом с ${place.name}`;
          } else if (place?.street) {
            text = `Вы находитесь на улице ${place.street}`;
            if (place.housenumber) {
              text += `, дом ${place.housenumber}`;
            }
          } else {
            text = "Не удалось определить точный адрес";
          }

          setUserAddress(text);
          speakRu(text);
        } catch (e) {
          const fallback = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

          setUserAddress(fallback);
          speakRu("Не удалось определить адрес, сообщаю координаты");
        }
      },
      () => {
        setError("Не удалось получить геолокацию.");
      },
      { enableHighAccuracy: true },
    );
  };

  useEffect(() => {
    if ((!isNavigating && !voiceOnlyMode) || !route?.steps.length) return;
    if (!("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const current: LatLng = [pos.coords.latitude, pos.coords.longitude];
        if (typeof pos.coords.heading === "number" && !Number.isNaN(pos.coords.heading)) {
          setHeading(pos.coords.heading);
        }
        setUserCoord(current);
        setUserAddress(`${current[0].toFixed(5)}, ${current[1].toFixed(5)}`);

        const distanceFromRoute = distanceToPolyline(current, route.geometry ?? []);

        if (distanceFromRoute > 35) {
          offRouteCounterRef.current += 1;
        } else {
          offRouteCounterRef.current = 0;

          if (route.offRoute) {
            setRoute((prev) => (prev ? { ...prev, offRoute: false } : prev));
          }
        }

        if (offRouteCounterRef.current >= 3) {
          const now = Date.now();

          if (now - lastOffRouteAtRef.current > 12000) {
            setRoute((prev) => (prev ? { ...prev, offRoute: true } : prev));
            speakRu("Вы отклонились от маршрута");
            lastOffRouteAtRef.current = now;

            void rebuildRouteFromCurrentPosition(current);
          }
        }

        const step = route.steps[activeStepIndex];
        if (!step?.maneuver) return;

        const maneuverPoint: LatLng = [step.maneuver.lat, step.maneuver.lng];
        const metersLeft = distanceMeters(current, maneuverPoint);
        const now = Date.now();

        setDistanceToNextManeuver(metersLeft);

        if (metersLeft <= 10 && activeStepIndex < route.steps.length - 1) {
          const nextIndex = activeStepIndex + 1;
          const nextStep = route.steps[nextIndex];

          setActiveStepIndex(nextIndex);

          if (nextStep) {
            speakRu(nextStep.voiceHint ?? nextStep.instruction);
            lastSpokenStepRef.current = nextIndex;
            lastPromptAtRef.current = now;
          }

          return;
        }

        if (
          metersLeft <= 60 &&
          lastSpokenStepRef.current !== activeStepIndex &&
          now - lastPromptAtRef.current > 9000
        ) {
          speakRu(buildDistanceVoice(step.voiceHint ?? step.instruction, metersLeft));
          lastSpokenStepRef.current = activeStepIndex;
          lastPromptAtRef.current = now;
        }
      },
      () => {
        setError("Не удалось отслеживать текущее местоположение.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isNavigating, route, activeStepIndex]);

  return {
    voiceOnlyMode,
    setVoiceOnlyMode,
    userCoord,
    userAddress,
    heading,
    whereAmI,
    cityMode,
    setCityMode,
    patchRoute,
    from,
    to,
    route,
    view,
    error,
    canBuild,
    isNavigating,
    isBuilding,
    activeStepIndex,
    activeStep,
    activeManeuver,
    distanceToNextManeuver,
    setFrom,
    setTo,
    setView,
    setActiveStepIndex,
    buildRoute,
    buildRouteFromValues,
    start,
    speakStep,
    next,
    prev,
    stop,
  };
}