import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { simplifyInstruction, summarizeRoute } from "../features/mini-ai/assistant";
import { RouteControls } from "../features/navigation/components/RouteControls";
import { RouteForm } from "../features/navigation/components/RouteForm";
import { RouteSummary } from "../features/navigation/components/RouteSummary";
import { StepsPanel } from "../features/navigation/components/StepsPanel";
import { ViewToggle } from "../features/navigation/components/ViewToggle";
import { MapPanel } from "../features/navigation/components/MapPanel";
import { useNavigation } from "../features/navigation/useNavigation";
import { speakRu, stopSpeak } from "../features/navigation/tts";
import type { LatLng } from "../features/navigation/types";
import Header from "./Header";

type SpeechRecognitionType = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: any) => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): { new (): SpeechRecognitionType } | null {
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/ё/g, "е");
}

function parseVoiceRoute(text: string) {
  const cleaned = text.trim().replace(/^маршрут\s+/i, "");
  const parts = cleaned.split(/\s+до\s+/i);

  if (parts.length < 2) return null;

  const from = parts[0]?.trim();
  const to = parts.slice(1).join(" до ").trim();

  if (!from || !to) return null;

  return { from, to };
}

function isCurrentLocation(text: string) {
  const value = normalize(text);
  return (
    value.includes("мое местоположение") ||
    value.includes("мое положение") ||
    value.includes("мое место") ||
    (value.includes("мое") && value.includes("местополож")) ||
    value.includes("я нахожусь")
  );
}

function getCurrentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Геолокация не поддерживается."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
      () => reject(new Error("Не удалось определить текущее местоположение.")),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

export default function NavigatePage() {
  const nav = useNavigation();
  const location = useLocation();

  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState("");
  const [listening, setListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  const miniAiRouteSummary = useMemo(() => summarizeRoute(nav.route), [nav.route]);

  const miniAiCurrentStep = useMemo(() => {
    if (!nav.activeStep) {
      return "Постройте маршрут, и мини-ИИ кратко объяснит текущий шаг.";
    }

    return simplifyInstruction(nav.activeStep.instruction);
  }, [nav.activeStep]);

  const canUseSTT = useMemo(() => {
    if (typeof window === "undefined") return false;
    return !!getSpeechRecognition();
  }, []);

  useEffect(() => {
    if (!canUseSTT) return;

    const SR = getSpeechRecognition();
    if (!SR) return;

    const rec = new SR();
    rec.lang = "ru-RU";
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (e: any) => {
      const result = e.results?.[e.results.length - 1];
      if (!result) return;

      const transcript = String(result[0]?.transcript ?? "");
      const isFinal = Boolean(result.isFinal);

      setRecognizedText(transcript);

      if (isFinal) {
        void handleVoiceRoute(transcript);
      }
    };

    rec.onerror = (e: any) => {
      setVoiceError(`Ошибка распознавания речи: ${e?.error ?? "unknown"}`);
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [canUseSTT]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get("mode");

    if (mode === "where") {
      nav.setView("map");
      void nav.whereAmI?.();
      return;
    }

    if (mode === "voice-route") {
      nav.setView("steps");
      setVoiceHint("Скажите: Маршрут Сарайшык 5Е до Мега Силквей");
      speakRu("Назовите маршрут. Например: маршрут Сарайшык 5Е до Мега Силквей.");
      window.setTimeout(() => {
        startVoiceRouteListening();
      }, 700);
    }
  }, [location.search]);

  function startVoiceRouteListening() {
    if (!canUseSTT) {
      setVoiceError(
        "Браузер не поддерживает распознавание речи. Используйте Chrome или Edge."
      );
      return;
    }

    setVoiceError(null);
    setRecognizedText("");
    setVoiceHint("Слушаю команду маршрута...");

    try {
      recognitionRef.current?.start();
      setListening(true);
    } catch {
      setVoiceError("Не удалось включить микрофон. Проверьте разрешение браузера.");
      setListening(false);
    }
  }

  function stopVoiceRouteListening() {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }

    stopSpeak();
    setListening(false);
    setVoiceHint(null);
  }

  async function handleVoiceRoute(transcript: string) {
    const parsed = parseVoiceRoute(transcript);

    if (!parsed) {
      const msg =
        "Не удалось распознать маршрут. Скажите так: Маршрут Сарайшык 5Е до Мега Силквей.";
      setVoiceHint(msg);
      setVoiceError(msg);
      speakRu(msg);
      return;
    }

    setVoiceError(null);

    try {
      let fromCoord: LatLng | undefined;
      let fromLabel = parsed.from;

      if (isCurrentLocation(parsed.from)) {
        fromCoord = await getCurrentPosition();
        fromLabel = "Мое местоположение";
      }

      await nav.buildRouteFromValues(fromLabel, parsed.to, fromCoord);
      nav.setView("steps");

      const msg = `Строю маршрут от ${fromLabel} до ${parsed.to}.`;
      setVoiceHint(msg);
      speakRu(msg);
    } catch (error: any) {
      const msg = error?.message ?? "Не удалось подготовить маршрут.";
      setVoiceError(msg);
      speakRu(msg);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Навигация</h1>
            <p className="text-sm text-slate-600">Экран построения маршрута</p>
          </div>

          <ViewToggle view={nav.view} onChange={nav.setView} />
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="space-y-3">
                <RouteForm
                  from={nav.from}
                  to={nav.to}
                  onFromChange={nav.setFrom}
                  onToChange={nav.setTo}
                  cityMode={nav.cityMode}
                  setCityMode={nav.setCityMode}
                />

                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={startVoiceRouteListening}
                    disabled={!canUseSTT || listening}
                    className={[
                      "w-full rounded-xl px-3 py-2 text-sm font-semibold transition",
                      !canUseSTT || listening
                        ? "cursor-not-allowed bg-slate-200 text-slate-500"
                        : "bg-blue-600 text-white hover:bg-blue-700",
                    ].join(" ")}
                  >
                    Сказать маршрут голосом
                  </button>

                  <button
                    type="button"
                    onClick={stopVoiceRouteListening}
                    className="w-full rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                  >
                    Остановить прослушивание
                  </button>
                  <button
                    onClick={() => nav.setVoiceOnlyMode(!nav.voiceOnlyMode)}
                    className={`w-full rounded-xl px-3 py-2 text-sm font-semibold ${
                      nav.voiceOnlyMode
                        ? "bg-purple-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {nav.voiceOnlyMode ? "🔊 Голосовой режим ВКЛ" : "🔇 Голосовой режим"}
                  </button>
                </div>

                {recognizedText ? (
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                    Распознано: {recognizedText}
                  </div>
                ) : null}

                {voiceHint ? (
                  <div className="rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-800 ring-1 ring-sky-100">
                    {voiceHint}
                  </div>
                ) : null}

                {voiceError ? (
                  <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
                    {voiceError}
                  </div>
                ) : null}

                {nav.error ? (
                  <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
                    {nav.error}
                  </div>
                ) : null}

                {nav.route?.offRoute ? (
                  <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-100">
                    Вы отклонились от маршрута
                  </div>
                ) : null}

                {nav.distanceToNextManeuver !== null && nav.isNavigating ? (
                  <div className="rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-800 ring-1 ring-indigo-100">
                    До следующего манёвра: {Math.round(nav.distanceToNextManeuver)} м
                  </div>
                ) : null}

                

                <RouteControls
                  canBuild={nav.canBuild}
                  hasRoute={!!nav.route}
                  onBuild={nav.buildRoute}
                  onStart={nav.start}
                  onSpeak={nav.speakStep}
                />

                {nav.route ? (
                  <RouteSummary
                    route={nav.route}
                    isNavigating={nav.isNavigating}
                    activeStepIndex={nav.activeStepIndex}
                    onPrev={nav.prev}
                    onNext={nav.next}
                    onStop={nav.stop}
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              {nav.view === "map" ? (
                  <MapPanel
                    route={nav.route}
                    userCoord={nav.userCoord}
                    userAddress={nav.userAddress}
                    activeManeuver={nav.activeManeuver}
                    heading={nav.heading}
                  />
                ) : nav.view === "steps" ? (
                  <StepsPanel
                    route={nav.route}
                    activeStep={nav.activeStep}
                    activeStepIndex={nav.activeStepIndex}
                    isNavigating={nav.isNavigating}
                    onPickStep={nav.setActiveStepIndex}
                  />
                ) : (
                  // 👓 РЕЖИМ ОЧКОВ
                  <div className="flex h-[420px] flex-col items-center justify-center text-center">
                    {!nav.route ? (
                      <div className="text-lg text-slate-500">
                        Постройте маршрут
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-slate-500 mb-2">
                          Следующее действие
                        </div>

                        <div className="text-2xl font-bold text-slate-900 mb-4">
                          {nav.activeStep?.instruction}
                        </div>

                        {nav.distanceToNextManeuver !== null ? (
                          <div className="text-xl text-blue-600 mb-4">
                            {Math.round(nav.distanceToNextManeuver)} м
                          </div>
                        ) : null}

                        {nav.route.offRoute ? (
                          <div className="text-red-600 text-lg mb-4">
                            Вы отклонились от маршрута
                          </div>
                        ) : null}

                        <div className="flex gap-3">
                          <button
                            onClick={nav.speakStep}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-white"
                          >
                            🔊 Повторить
                          </button>

                          {!nav.isNavigating ? (
                            <button
                              onClick={nav.start}
                              className="rounded-xl bg-green-600 px-4 py-2 text-white"
                            >
                              ▶ Старт
                            </button>
                          ) : (
                            <button
                              onClick={nav.stop}
                              className="rounded-xl bg-red-600 px-4 py-2 text-white"
                            >
                              ■ Стоп
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
            </div>

            <div className="mt-4 rounded-2xl bg-sky-50 p-4 shadow-sm ring-1 ring-sky-100">
              <div className="text-sm font-semibold text-slate-900">Мини-ИИ</div>
              <div className="mt-2 text-sm text-slate-700">{miniAiRouteSummary}</div>
              <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-800 ring-1 ring-sky-100">
                Текущий шаг простыми словами: {miniAiCurrentStep}
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Голосовой формат: "Маршрут Сарайшык 5Е до Мега Силквей" или
              "Маршрут мое местоположение до Мега Силквей".
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}