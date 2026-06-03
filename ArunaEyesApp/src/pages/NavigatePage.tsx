import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import {
  simplifyInstruction,
  summarizeRoute,
} from "../features/mini-ai/assistant";
import { RouteControls } from "../features/navigation/components/RouteControls";
import { RouteForm } from "../features/navigation/components/RouteForm";
import { RouteSummary } from "../features/navigation/components/RouteSummary";
import { StepsPanel } from "../features/navigation/components/StepsPanel";
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

type MobileMode = "map" | "steps" | "glasses";

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

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [mobileMode, setMobileMode] = useState<MobileMode>("map");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(true);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  const miniAiRouteSummary = useMemo(
    () => summarizeRoute(nav.route),
    [nav.route]
  );

  const miniAiCurrentStep = useMemo(() => {
    if (!nav.activeStep) {
      return "Постройте маршрут, и Eyes кратко объяснит текущий шаг.";
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
      if (isFinal) void handleVoiceRoute(transcript);
    };
    rec.onerror = (e: any) => {
      setVoiceError(`Ошибка распознавания речи: ${e?.error ?? "unknown"}`);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    return () => {
      try { rec.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, [canUseSTT]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get("mode");
    if (mode === "where") {
      nav.setView("map");
      setMobileMode("map");
      void nav.whereAmI?.();
      return;
    }
    if (mode === "voice-route") {
      nav.setView("steps");
      setMobileMode("steps");
      setVoiceHint("Скажите: Маршрут Сарайшык 5Е до Мега Силквей");
      speakRu("Назовите маршрут.");
      window.setTimeout(() => startVoiceRouteListening(), 700);
    }
  }, [location.search]);

  function startVoiceRouteListening() {
    if (!canUseSTT) {
      setVoiceError("Браузер не поддерживает распознавание речи. Используйте Chrome или Edge.");
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
    try { recognitionRef.current?.stop(); } catch {}
    stopSpeak();
    setListening(false);
    setVoiceHint(null);
  }

  async function handleVoiceRoute(transcript: string) {
    const parsed = parseVoiceRoute(transcript);
    if (!parsed) {
      const msg = "Не удалось распознать маршрут. Скажите так: Маршрут Сарайшык 5Е до Мега Силквей.";
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
      setMobileMode("steps");
      const msg = `Строю маршрут от ${fromLabel} до ${parsed.to}.`;
      setVoiceHint(msg);
      speakRu(msg);
    } catch (error: any) {
      const msg = error?.message ?? "Не удалось подготовить маршрут.";
      setVoiceError(msg);
      speakRu(msg);
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - touchStartX.current;
    const diffY = endY - touchStartY.current;
    if (Math.abs(diffX) > 70 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) setLeftOpen(false);
      if (diffX > 0) setRightOpen(false);
    }
    if (Math.abs(diffY) > 60 && Math.abs(diffY) > Math.abs(diffX)) {
      if (diffY > 0) setMobileDrawerOpen(false);
      if (diffY < 0) setMobileDrawerOpen(true);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  /* ─── Glasses panel ─────────────────────────────────────────── */
  const glassPanel = !nav.route ? (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center">
      <div className="nav-glass-card flex flex-col items-center gap-4 px-8 py-8 text-center">
        <div className="nav-icon-wrap">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="5" cy="12" r="3"/><circle cx="19" cy="12" r="3"/>
            <path d="M2 12h1M8 12h8M22 12h-1M5 9V7a1 1 0 0 1 1-1h4l2 2h1a1 1 0 0 1 1 1v2"/>
          </svg>
        </div>
        <div className="nav-panel-title">Режим очков</div>
        <div className="nav-muted-text">Постройте маршрут — здесь появится AR-навигация для очков</div>
      </div>
    </div>
  ) : (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-5">
      <div className="nav-glass-card w-full max-w-md">
        <div className="nav-label mb-4">Следующее действие</div>
        <div className="nav-heading-lg leading-tight">{nav.activeStep?.instruction}</div>

        {nav.distanceToNextManeuver !== null && (
          <div className="nav-badge-purple mt-5">
            {Math.round(nav.distanceToNextManeuver)} м
          </div>
        )}

        {nav.route.offRoute && (
          <div className="nav-alert-red mt-4">Вы отклонились от маршрута</div>
        )}

        <div className="mt-6 flex gap-3">
          <button onClick={nav.speakStep} className="nav-btn-dark flex-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
            Повторить
          </button>
          {!nav.isNavigating ? (
            <button onClick={nav.start} className="nav-btn-green flex-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Старт
            </button>
          ) : (
            <button onClick={nav.stop} className="nav-btn-red flex-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
              </svg>
              Стоп
            </button>
          )}
        </div>
      </div>
    </div>
  );

  /* ─── Route panel ────────────────────────────────────────────── */
  const routePanel = (
    <div className="nav-panel-content space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="nav-label">Навигация</div>
          <div className="nav-heading">Маршрут</div>
        </div>
        <div className="nav-status-dot" title="Готов к работе" />
      </div>

      {/* Route form */}
      <div className="nav-section">
        <RouteForm
          from={nav.from}
          to={nav.to}
          onFromChange={nav.setFrom}
          onToChange={nav.setTo}
          cityMode={nav.cityMode}
          setCityMode={nav.setCityMode}
        />
      </div>

      {/* Voice controls */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={startVoiceRouteListening}
          disabled={!canUseSTT || listening}
          className={listening ? "nav-btn-listening w-full" : "nav-btn-dark w-full"}
        >
          {listening ? (
            <>
              <span className="nav-pulse-ring" />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
              Слушаю...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
              Сказать маршрут
            </>
          )}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={stopVoiceRouteListening}
            className="nav-btn-ghost"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
            </svg>
            Стоп
          </button>

          <button
            onClick={() => nav.setVoiceOnlyMode(!nav.voiceOnlyMode)}
            className={nav.voiceOnlyMode ? "nav-btn-purple" : "nav-btn-ghost"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {nav.voiceOnlyMode
                ? <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></>
                : <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>
              }
            </svg>
            {nav.voiceOnlyMode ? "Голос вкл" : "Голос"}
          </button>
        </div>
      </div>

      {/* Recognized text */}
      {recognizedText && (
        <div className="nav-info-box">
          <div className="nav-info-label">Распознано</div>
          <div className="nav-info-text">{recognizedText}</div>
        </div>
      )}

      {/* Hints & errors */}
      {voiceHint && (
        <div className="nav-hint-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{voiceHint}</span>
        </div>
      )}

      {(voiceError || nav.error) && (
        <div className="nav-alert-red">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span>{voiceError || nav.error}</span>
        </div>
      )}

      {nav.route?.offRoute && (
        <div className="nav-alert-amber">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Вы отклонились от маршрута</span>
        </div>
      )}

      {nav.distanceToNextManeuver !== null && nav.isNavigating && (
        <div className="nav-info-box nav-info-box--indigo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>До манёвра: <strong>{Math.round(nav.distanceToNextManeuver)} м</strong></span>
        </div>
      )}

      {/* Build / controls */}
      <RouteControls
        canBuild={nav.canBuild}
        hasRoute={!!nav.route}
        onBuild={nav.buildRoute}
        onStart={nav.start}
        onSpeak={nav.speakStep}
      />

      {/* Route summary */}
      {nav.route && (
        <RouteSummary
          route={nav.route}
          isNavigating={nav.isNavigating}
          activeStepIndex={nav.activeStepIndex}
          onPrev={nav.prev}
          onNext={nav.next}
          onStop={nav.stop}
        />
      )}

      {/* Mini AI block */}
      <div className="nav-ai-card">
        <div className="nav-ai-header">
          <div className="nav-ai-dot" />
          <span className="nav-ai-label">EyesAI</span>
        </div>
        <div className="nav-ai-summary">{miniAiRouteSummary}</div>
        <div className="nav-ai-step">{miniAiCurrentStep}</div>
      </div>

    </div>
  );

  /* ─── Render ─────────────────────────────────────────────────── */
  return (
    <div
      className="relative h-dvh w-full overflow-hidden bg-[#efe9ff] text-zinc-950"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        /* ── Shared tokens ───────────────────────────────── */
        :root {
          --nav-glass: rgba(255,255,255,0.55);
          --nav-glass-border: rgba(255,255,255,0.72);
          --nav-shadow: 0 24px 80px rgba(75,45,130,0.18);
          --nav-shadow-sm: 0 8px 32px rgba(75,45,130,0.12);
          --nav-radius: 1.75rem;
          --nav-radius-sm: 1rem;
          --nav-purple: #7c3aed;
          --nav-purple-light: rgba(139,92,246,0.15);
        }

        /* ── Leaflet ─────────────────────────────────────── */
        .nav-map-shell .leaflet-container {
          height: 100%;
          min-height: 100%;
          border-radius: 0;
          background: #efe9ff;
        }

        /* ── Scrollbar ───────────────────────────────────── */
        .nav-scroll::-webkit-scrollbar { width: 4px; }
        .nav-scroll::-webkit-scrollbar-track { background: transparent; }
        .nav-scroll::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.25); border-radius: 9999px; }

        /* ── Panel chrome ────────────────────────────────── */
        .nav-panel-content { padding: 0; }
        .nav-section { }

        /* ── Typography ──────────────────────────────────── */
        .nav-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--nav-purple);
        }
        .nav-heading {
          font-size: 1.5rem;
          font-weight: 900;
          color: #18181b;
          line-height: 1.1;
          margin-top: 2px;
        }
        .nav-heading-lg {
          font-size: 1.75rem;
          font-weight: 900;
          color: #18181b;
          line-height: 1.15;
        }
        .nav-muted-text {
          font-size: 0.85rem;
          color: #71717a;
          line-height: 1.5;
        }
        .nav-panel-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: #18181b;
        }

        /* ── Badges ──────────────────────────────────────── */
        .nav-badge-purple {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--nav-purple-light);
          color: var(--nav-purple);
          font-size: 1.1rem;
          font-weight: 900;
          padding: 6px 18px;
          border-radius: 9999px;
        }

        /* ── Status dot ──────────────────────────────────── */
        .nav-status-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 3px rgba(34,197,94,0.2);
        }

        /* ── Glass card ──────────────────────────────────── */
        .nav-glass-card {
          background: var(--nav-glass);
          border: 1px solid var(--nav-glass-border);
          border-radius: var(--nav-radius);
          padding: 1.5rem;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: var(--nav-shadow);
        }

        /* ── Icon wrap ───────────────────────────────────── */
        .nav-icon-wrap {
          width: 56px; height: 56px;
          border-radius: 16px;
          background: var(--nav-purple-light);
          color: var(--nav-purple);
          display: flex; align-items: center; justify-content: center;
        }

        /* ── Buttons ─────────────────────────────────────── */
        .nav-btn-dark, .nav-btn-ghost, .nav-btn-purple,
        .nav-btn-green, .nav-btn-red, .nav-btn-listening {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.82rem;
          font-weight: 800;
          border-radius: var(--nav-radius-sm);
          padding: 10px 16px;
          transition: all 0.18s ease;
          cursor: pointer;
          border: none;
          outline: none;
          white-space: nowrap;
        }

        .nav-btn-dark {
          background: #18181b;
          color: #fff;
          box-shadow: 0 4px 20px rgba(0,0,0,0.18);
        }
        .nav-btn-dark:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(0,0,0,0.22); }
        .nav-btn-dark:active { transform: scale(0.98); }
        .nav-btn-dark:disabled { background: #d4d4d8; color: #a1a1aa; box-shadow: none; cursor: not-allowed; transform: none; }

        .nav-btn-ghost {
          background: rgba(255,255,255,0.65);
          color: #3f3f46;
          border: 1px solid rgba(255,255,255,0.8);
          box-shadow: var(--nav-shadow-sm);
        }
        .nav-btn-ghost:hover { background: rgba(255,255,255,0.85); transform: translateY(-1px); }
        .nav-btn-ghost:active { transform: scale(0.98); }

        .nav-btn-purple {
          background: var(--nav-purple);
          color: #fff;
          box-shadow: 0 4px 20px rgba(124,58,237,0.3);
        }
        .nav-btn-purple:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(124,58,237,0.4); }

        .nav-btn-green {
          background: #16a34a;
          color: #fff;
          box-shadow: 0 4px 16px rgba(22,163,74,0.3);
        }
        .nav-btn-green:hover { transform: translateY(-1px); }

        .nav-btn-red {
          background: #dc2626;
          color: #fff;
          box-shadow: 0 4px 16px rgba(220,38,38,0.25);
        }
        .nav-btn-red:hover { transform: translateY(-1px); }

        .nav-btn-listening {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: #fff;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(124,58,237,0.35);
        }
        .nav-btn-listening:hover { transform: translateY(-1px); }

        /* ── Pulse ring for listening ────────────────────── */
        .nav-pulse-ring {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          animation: navPulse 1.4s ease-out infinite;
          border: 2px solid rgba(255,255,255,0.5);
          pointer-events: none;
        }
        @keyframes navPulse {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.12); }
        }

        /* ── Info / hint / alert boxes ───────────────────── */
        .nav-info-box {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: rgba(255,255,255,0.65);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: var(--nav-radius-sm);
          padding: 10px 14px;
          font-size: 0.82rem;
          color: #3f3f46;
        }
        .nav-info-box--indigo {
          background: rgba(224,231,255,0.7);
          border-color: rgba(165,180,252,0.5);
          color: #3730a3;
        }
        .nav-info-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #71717a;
          margin-bottom: 3px;
        }
        .nav-info-text {
          font-size: 0.85rem;
          color: #3f3f46;
          font-weight: 500;
        }
        .nav-hint-box {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: rgba(237,233,255,0.8);
          border: 1px solid rgba(196,181,253,0.5);
          border-radius: var(--nav-radius-sm);
          padding: 10px 14px;
          font-size: 0.82rem;
          color: #5b21b6;
          font-weight: 500;
        }
        .nav-alert-red {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: rgba(254,226,226,0.85);
          border: 1px solid rgba(252,165,165,0.5);
          border-radius: var(--nav-radius-sm);
          padding: 10px 14px;
          font-size: 0.82rem;
          color: #991b1b;
          font-weight: 600;
        }
        .nav-alert-amber {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: rgba(255,251,235,0.85);
          border: 1px solid rgba(253,211,77,0.4);
          border-radius: var(--nav-radius-sm);
          padding: 10px 14px;
          font-size: 0.82rem;
          color: #92400e;
          font-weight: 600;
        }

        /* ── AI card ─────────────────────────────────────── */
        .nav-ai-card {
          background: linear-gradient(135deg, rgba(237,233,255,0.7) 0%, rgba(255,255,255,0.5) 100%);
          border: 1px solid rgba(196,181,253,0.4);
          border-radius: var(--nav-radius-sm);
          padding: 14px 16px;
        }
        .nav-ai-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .nav-ai-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--nav-purple);
          box-shadow: 0 0 6px rgba(124,58,237,0.6);
          animation: aiPulse 2s ease-in-out infinite;
        }
        @keyframes aiPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .nav-ai-label {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--nav-purple);
        }
        .nav-ai-summary {
          font-size: 0.83rem;
          color: #3f3f46;
          line-height: 1.5;
        }
        .nav-ai-step {
          margin-top: 8px;
          background: rgba(255,255,255,0.7);
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 0.82rem;
          color: #52525b;
          line-height: 1.5;
        }

        /* ── Toggle button for panels ────────────────────── */
        .nav-toggle-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 50;
          width: 28px;
          height: 56px;
          border-radius: 0 10px 10px 0;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.85);
          border-left: none;
          backdrop-filter: blur(12px);
          display: none;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 2px 0 16px rgba(75,45,130,0.1);
          color: #52525b;
          font-size: 14px;
          font-weight: 900;
        }
        .nav-toggle-btn:hover { background: rgba(255,255,255,0.9); }
        .nav-toggle-btn--right {
          border-radius: 10px 0 0 10px;
          border-left: 1px solid rgba(255,255,255,0.85);
          border-right: none;
          box-shadow: -2px 0 16px rgba(75,45,130,0.1);
        }
        @media (min-width: 768px) {
          .nav-toggle-btn { display: flex; }
        }

        /* ── Mobile tab bar ──────────────────────────────── */
        .nav-tab-bar {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          z-index: 40;
          display: flex;
          background: rgba(255,255,255,0.65);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 9999px;
          padding: 4px;
          box-shadow: var(--nav-shadow-sm);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          gap: 2px;
        }
        .nav-tab {
          font-size: 0.78rem;
          font-weight: 800;
          padding: 7px 16px;
          border-radius: 9999px;
          transition: all 0.2s;
          cursor: pointer;
          border: none;
          background: transparent;
          color: #52525b;
        }
        .nav-tab--active {
          background: #18181b;
          color: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        /* ── Mobile drawer ───────────────────────────────── */
        .nav-drawer-handle {
          width: 36px; height: 4px;
          border-radius: 9999px;
          background: rgba(0,0,0,0.15);
          margin: 0 auto 16px;
          cursor: pointer;
        }

        /* ── Side panel ──────────────────────────────────── */
        .nav-side-panel {
          position: absolute;
          top: 96px;
          z-index: 40;
          width: 340px;
          max-height: calc(100dvh - 116px);
          overflow-y: auto;
          border-radius: var(--nav-radius);
          border: 1px solid var(--nav-glass-border);
          background: rgba(255,255,255,0.6);
          padding: 20px;
          box-shadow: var(--nav-shadow);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          transition: transform 0.4s cubic-bezier(0.32, 0, 0.08, 1);
          display: none;
        }
        @media (min-width: 768px) {
          .nav-side-panel { display: block; }
        }

        /* ── Hint bar bottom ─────────────────────────────── */
        .nav-hint-bar {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 30;
          display: none;
          background: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 9999px;
          padding: 6px 18px;
          font-size: 11px;
          font-weight: 600;
          color: #71717a;
          backdrop-filter: blur(16px);
          white-space: nowrap;
          letter-spacing: 0.04em;
        }
        @media (min-width: 768px) {
          .nav-hint-bar { display: block; }
        }
      `}</style>

      {/* Background blobs */}
      <div className="absolute inset-0">
        <div className="absolute -left-28 -top-28 h-[30rem] w-[30rem] rounded-full bg-violet-300/60 blur-3xl" />
        <div className="absolute -right-20 top-10 h-[28rem] w-[28rem] rounded-full bg-fuchsia-200/70 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#ffffffb8,transparent_44%),linear-gradient(135deg,#f8f4ff,#ded3ff_52%,#f7f2ff)]" />
      </div>

      {/* Header */}
      <div className="relative z-30">
        <Header />
      </div>

      {/* Map shell */}
      <div className="absolute inset-0 z-10 pt-[88px] md:flex md:items-center md:justify-center md:px-8">
        <div className="nav-map-shell h-full w-full overflow-hidden md:h-[76dvh] md:max-h-[760px] md:max-w-[1180px] md:rounded-[2.4rem] md:border md:border-white/70 md:bg-white/35 md:p-3 md:shadow-[0_40px_120px_rgba(75,45,130,.24)] md:backdrop-blur-2xl">
          <MapPanel
            route={nav.route}
            userCoord={nav.userCoord}
            userAddress={nav.userAddress}
            activeManeuver={nav.activeManeuver}
            heading={nav.heading}
          />
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="nav-tab-bar top-[92px] md:hidden">
        {(["map", "steps", "glasses"] as MobileMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => { setMobileMode(mode); setMobileDrawerOpen(true); }}
            className={`nav-tab ${mobileMode === mode ? "nav-tab--active" : ""}`}
          >
            {mode === "map" ? "Карта" : mode === "steps" ? "Шаги" : "Очки"}
          </button>
        ))}
      </div>

      {/* LEFT side panel */}
      <aside
        className="nav-side-panel nav-scroll"
        style={{
          left: "16px",
          transform: leftOpen ? "translateX(0)" : "translateX(-380px)",
        }}
      >
        {routePanel}
      </aside>

      {/* Left toggle */}
      <button
        onClick={() => setLeftOpen(!leftOpen)}
        className="nav-toggle-btn"
        style={{ left: leftOpen ? "372px" : "16px" }}
        aria-label="Toggle route panel"
      >
        {leftOpen ? "‹" : "›"}
      </button>

      {/* RIGHT side panel */}
      <aside
        className="nav-side-panel nav-scroll"
        style={{
          right: "16px",
          left: "auto",
          transform: rightOpen ? "translateX(0)" : "translateX(380px)",
        }}
      >
        {/* Steps header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="nav-label">Навигация</div>
            <div className="nav-heading">Шаги</div>
          </div>
          <button
            onClick={() => setRightOpen(false)}
            className="nav-btn-ghost !px-3 !py-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        <StepsPanel
          route={nav.route}
          activeStep={nav.activeStep}
          activeStepIndex={nav.activeStepIndex}
          isNavigating={nav.isNavigating}
          onPickStep={nav.setActiveStepIndex}
        />
      </aside>

      {/* Right toggle */}
      <button
        onClick={() => setRightOpen(!rightOpen)}
        className="nav-toggle-btn nav-toggle-btn--right"
        style={{ right: rightOpen ? "372px" : "16px" }}
        aria-label="Toggle steps panel"
      >
        {rightOpen ? "›" : "‹"}
      </button>

      {/* Mobile bottom drawer */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-50 rounded-t-[1.75rem] border border-white/70 bg-white/72 shadow-[0_-16px_60px_rgba(75,45,130,0.16)] backdrop-blur-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0,0.08,1)] md:hidden ${
          mobileDrawerOpen ? "translate-y-0" : "translate-y-[calc(100%-68px)]"
        }`}
        style={{ backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)" }}
      >
        <button
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          className="w-full pt-4 pb-1 flex justify-center"
          aria-label="Toggle drawer"
        >
          <div className="nav-drawer-handle" />
        </button>

        <div className="nav-scroll max-h-[65dvh] overflow-y-auto px-4 pb-6">
          {mobileMode === "map" ? (
            routePanel
          ) : mobileMode === "steps" ? (
            <div>
              <div className="nav-heading mb-4">Шаги</div>
              <StepsPanel
                route={nav.route}
                activeStep={nav.activeStep}
                activeStepIndex={nav.activeStepIndex}
                isNavigating={nav.isNavigating}
                onPickStep={nav.setActiveStepIndex}
              />
            </div>
          ) : (
            glassPanel
          )}
        </div>
      </div>

      {/* Bottom hint */}
      <div className="nav-hint-bar">
        Свайп влево / вправо — скрыть панели
      </div>
    </div>
  );
}