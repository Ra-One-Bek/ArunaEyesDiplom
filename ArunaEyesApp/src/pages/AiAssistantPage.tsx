import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  answerAppQuestion,
  rejectOffTopic,
  summarizeRecognizedText,
} from "../features/mini-ai/assistant";
import { reverseGeocode } from "../features/navigation/navigationApi";
import Header from "./Header";


const API_BASE =
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ??
  "http://localhost:4000/api";

type Command =
  | { type: "build_route" }
  | { type: "repeat" }
  | { type: "where_am_i" }
  | { type: "time" }
  | { type: "play_music" }
  | { type: "unknown"; raw: string };

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/ё/g, "е");
}

function parseCommand(text: string): Command {
  const t = normalize(text);

  if (
    t.includes("сколько сейчас времени") ||
    t.includes("который час") ||
    t === "время" ||
    t.includes("скажи время")
  ) {
    return { type: "time" };
  }

  if (
    t.includes("включи музыку") ||
    t.includes("запусти музыку") ||
    t.includes("поставь музыку") ||
    t.includes("включи песню")
  ) {
    return { type: "play_music" };
  }

  if (t.includes("постро") && t.includes("маршрут")) {
    return { type: "build_route" };
  }

  if (t.includes("повтор")) {
    return { type: "repeat" };
  }

  if (t.includes("где я")) {
    return { type: "where_am_i" };
  }

  return { type: "unknown", raw: text };
}

function speakRu(text: string) {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;
  window.localStorage.setItem("eyesapp:lastSpokenText", text);
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ru-RU";
  u.rate = 1;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
}

function stopSpeak() {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}

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

export default function AiAssistantPage() {
  const navigate = useNavigate();

  const [listening, setListening] = useState(false);
  const [userText, setUserText] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [miniAiText, setMiniAiText] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

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
      setUserText(transcript);
      setMiniAiText(summarizeRecognizedText(transcript));
      if (isFinal) void handleFinalTranscript(transcript);
    };
    rec.onerror = (e: any) => {
      setError(`Ошибка распознавания речи: ${e?.error ?? "unknown"}`);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    return () => {
      try { rec.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, [canUseSTT]);

  function startListening() {
    setError(null);
    setHint("Скажи: «построй маршрут», «где я» или свободный запрос");
    setUserText("");
    setMiniAiText("");
    try {
      recognitionRef.current?.start();
      setListening(true);
    } catch {
      setError("Не удалось запустить микрофон. Проверь разрешения браузера.");
      setListening(false);
    }
  }

  function stopAll() {
    setError(null);
    setHint(null);
    try { recognitionRef.current?.stop(); } catch {}
    stopSpeak();
    setListening(false);
  }

  function repeatAnswer() {
    if (!assistantText.trim()) {
      setHint("Пока нет ответа, который можно повторить.");
      return;
    }
    speakRu(assistantText);
  }

  async function sendAssistantQuery(text: string) {
    return new Promise<void>((resolve) => {
      if (!("geolocation" in navigator)) {
        const msg = "Геолокация не поддерживается.";
        setAssistantText(msg);
        speakRu(msg);
        resolve();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;
          try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/assistant/query`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text, latitude, longitude }),
            });
            if (!response.ok) throw new Error("Не удалось обработать запрос.");
            const data = await response.json();
            setAssistantText(data.text ?? "Запрос обработан.");
            speakRu(data.text ?? "Запрос обработан.");
          } catch (err: any) {
            const msg = err?.message ?? "Ошибка при обращении к ассистенту.";
            setAssistantText(msg);
            speakRu(msg);
          } finally {
            setLoading(false);
            resolve();
          }
        },
        () => {
          const msg = "Не получилось получить местоположение.";
          setAssistantText(msg);
          speakRu(msg);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  async function handleFinalTranscript(transcript: string) {
    setHint(null);
    const cmd = parseCommand(transcript);
    if (cmd.type === "time") {
      const now = new Date();

      const time = now.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const msg = `Сейчас ${time}.`;
      setAssistantText(msg);
      speakRu(msg);
      return;
    }

    if (cmd.type === "play_music") {
      const msg = "Включаю музыку.";
      setAssistantText(msg);
      speakRu(msg);

      window.localStorage.setItem("eyesapp:musicAutoplay", String(Date.now()));
      navigate("/music?autoplay=1");

      return;
    }

    if (cmd.type === "repeat") {
      if (!assistantText.trim()) {
        const msg = "Пока нечего повторять.";
        setAssistantText(msg);
        speakRu(msg);
      } else {
        speakRu(assistantText);
      }
      return;
    }

    if (cmd.type === "build_route") {
      const msg = "Открываю экран навигации. Скажи маршрут или введи адреса вручную.";
      setAssistantText(msg);
      speakRu(msg);
      navigate("/nav?mode=voice-route");
      return;
    }

    if (cmd.type === "where_am_i") {
      if (!("geolocation" in navigator)) {
        const msg = "Геолокация не поддерживается в этом браузере.";
        setAssistantText(msg);
        speakRu(msg);
        return;
      }
      const msgWait = "Сейчас узнаю ваше местоположение...";
      setAssistantText(msgWait);
      speakRu(msgWait);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          try {
            const place = await reverseGeocode(lat, lng);
            let msg = "";
            if (place?.name) {
              msg = `Вы находитесь рядом с ${place.name}`;
            } else if (place?.street) {
              msg = `Вы находитесь на улице ${place.street}`;
              if (place.housenumber) msg += `, дом ${place.housenumber}`;
            } else {
              msg = "Не удалось определить точный адрес.";
            }
            setAssistantText(msg);
            speakRu(msg);
          } catch {
            const msg = "Не удалось определить адрес.";
            setAssistantText(msg);
            speakRu(msg);
          }
        },
        () => {
          const msg = "Не получилось получить местоположение.";
          setAssistantText(msg);
          speakRu(msg);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
      return;
    }

    const appAnswer = answerAppQuestion(transcript);
    if (appAnswer) {
      setAssistantText(appAnswer);
      speakRu(appAnswer);
      return;
    }

    await sendAssistantQuery(transcript);
  }

  /* ─── Waveform bars (pure CSS, decorative) ───────────── */
  const waveBars = Array.from({ length: 5 });

  return (
    <div className="ai-root relative min-h-screen overflow-hidden bg-[#efe9ff] text-zinc-950">
      <style>{`
        /* ── Tokens ─────────────────────────────────────── */
        .ai-root {
          --ai-glass: rgba(255,255,255,0.58);
          --ai-glass-border: rgba(255,255,255,0.74);
          --ai-shadow: 0 24px 80px rgba(75,45,130,0.18);
          --ai-shadow-sm: 0 8px 32px rgba(75,45,130,0.10);
          --ai-radius: 1.75rem;
          --ai-radius-sm: 1rem;
          --ai-purple: #7c3aed;
          --ai-purple-light: rgba(139,92,246,0.13);
        }

        /* ── Layout ─────────────────────────────────────── */
        .ai-page-wrap {
          position: relative;
          z-index: 10;
          max-width: 860px;
          margin: 0 auto;
          padding: 20px 16px 48px;
        }

        /* ── Card chrome ────────────────────────────────── */
        .ai-card {
          background: var(--ai-glass);
          border: 1px solid var(--ai-glass-border);
          border-radius: var(--ai-radius);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          box-shadow: var(--ai-shadow);
          padding: 28px 28px 24px;
        }

        .ai-inner-card {
          background: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: var(--ai-radius-sm);
          padding: 16px 18px;
        }

        /* ── Typography ─────────────────────────────────── */
        .ai-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ai-purple);
        }
        .ai-heading {
          font-size: 1.6rem;
          font-weight: 900;
          color: #18181b;
          line-height: 1.1;
          margin-top: 2px;
        }
        .ai-subtext {
          font-size: 0.82rem;
          color: #71717a;
          line-height: 1.55;
          margin-top: 6px;
        }
        .ai-section-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #a1a1aa;
          margin-bottom: 6px;
        }
        .ai-section-text {
          font-size: 0.88rem;
          color: #3f3f46;
          line-height: 1.6;
          min-height: 44px;
        }
        .ai-section-text--empty {
          color: #a1a1aa;
          font-style: italic;
        }

        /* ── Mic orb ────────────────────────────────────── */
        .ai-orb-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 32px 0 24px;
        }
        .ai-orb {
          position: relative;
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: #18181b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 8px 32px rgba(0,0,0,0.22);
        }
        .ai-orb:hover { transform: scale(1.06); box-shadow: 0 12px 40px rgba(0,0,0,0.28); }
        .ai-orb:active { transform: scale(0.97); }
        .ai-orb--listening {
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          box-shadow: 0 8px 40px rgba(124,58,237,0.45);
          animation: orbPulse 1.6s ease-in-out infinite;
        }
        @keyframes orbPulse {
          0%, 100% { box-shadow: 0 8px 40px rgba(124,58,237,0.4); transform: scale(1); }
          50% { box-shadow: 0 8px 56px rgba(124,58,237,0.65); transform: scale(1.04); }
        }
        .ai-orb-ring {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          border: 2px solid rgba(124,58,237,0.3);
          animation: orbRing 1.6s ease-out infinite;
          pointer-events: none;
        }
        .ai-orb-ring-2 {
          inset: -22px;
          border-color: rgba(124,58,237,0.15);
          animation-delay: 0.4s;
        }
        @keyframes orbRing {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.3); }
        }
        .ai-orb-label {
          font-size: 0.78rem;
          font-weight: 700;
          color: #52525b;
          letter-spacing: 0.06em;
        }
        .ai-orb-label--active {
          color: var(--ai-purple);
        }

        /* ── Wave bars ──────────────────────────────────── */
        .ai-wave {
          display: flex;
          align-items: center;
          gap: 4px;
          height: 24px;
        }
        .ai-wave-bar {
          width: 3px;
          border-radius: 9999px;
          background: var(--ai-purple);
          animation: waveAnim 0.9s ease-in-out infinite;
          opacity: 0.7;
        }
        .ai-wave-bar:nth-child(1) { animation-delay: 0s;    animation-duration: 0.8s; }
        .ai-wave-bar:nth-child(2) { animation-delay: 0.15s; animation-duration: 0.95s; }
        .ai-wave-bar:nth-child(3) { animation-delay: 0.3s;  animation-duration: 0.75s; }
        .ai-wave-bar:nth-child(4) { animation-delay: 0.1s;  animation-duration: 1.0s; }
        .ai-wave-bar:nth-child(5) { animation-delay: 0.25s; animation-duration: 0.85s; }
        @keyframes waveAnim {
          0%, 100% { height: 4px; }
          50% { height: 20px; }
        }

        /* ── Action row ─────────────────────────────────── */
        .ai-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* ── Buttons ────────────────────────────────────── */
        .ai-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 0.8rem;
          font-weight: 800;
          border-radius: 9999px;
          padding: 9px 20px;
          transition: all 0.18s ease;
          cursor: pointer;
          border: none;
          outline: none;
          white-space: nowrap;
        }
        .ai-btn-ghost {
          background: rgba(255,255,255,0.68);
          color: #3f3f46;
          border: 1px solid rgba(255,255,255,0.85);
          box-shadow: var(--ai-shadow-sm);
        }
        .ai-btn-ghost:hover { background: rgba(255,255,255,0.9); transform: translateY(-1px); }
        .ai-btn-ghost:active { transform: scale(0.97); }
        .ai-btn-dark {
          background: #18181b;
          color: #fff;
          box-shadow: 0 4px 20px rgba(0,0,0,0.16);
        }
        .ai-btn-dark:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(0,0,0,0.22); }
        .ai-btn-dark:active { transform: scale(0.97); }
        .ai-btn-dark:disabled {
          background: #d4d4d8; color: #a1a1aa;
          box-shadow: none; cursor: not-allowed; transform: none;
        }

        /* ── Notification boxes ─────────────────────────── */
        .ai-notice {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          border-radius: var(--ai-radius-sm);
          padding: 11px 14px;
          font-size: 0.82rem;
          font-weight: 500;
          line-height: 1.5;
        }
        .ai-notice--hint {
          background: rgba(237,233,255,0.85);
          border: 1px solid rgba(196,181,253,0.5);
          color: #5b21b6;
        }
        .ai-notice--error {
          background: rgba(254,226,226,0.85);
          border: 1px solid rgba(252,165,165,0.45);
          color: #991b1b;
        }
        .ai-notice--warn {
          background: rgba(255,251,235,0.85);
          border: 1px solid rgba(253,211,77,0.4);
          color: #92400e;
        }
        .ai-notice--loading {
          background: rgba(240,249,255,0.85);
          border: 1px solid rgba(147,197,253,0.4);
          color: #1e40af;
        }

        /* ── AI dot (animated) ──────────────────────────── */
        .ai-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--ai-purple);
          box-shadow: 0 0 6px rgba(124,58,237,0.55);
          animation: aiDotPulse 2s ease-in-out infinite;
          flex-shrink: 0;
          margin-top: 3px;
        }
        @keyframes aiDotPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }

        /* ── Results grid ───────────────────────────────── */
        .ai-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .ai-grid { grid-template-columns: repeat(3, 1fr); }
        }

        /* ── Commands hint strip ────────────────────────── */
        .ai-cmd-strip {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .ai-cmd-pill {
          font-size: 0.74rem;
          font-weight: 700;
          padding: 5px 13px;
          border-radius: 9999px;
          background: rgba(255,255,255,0.6);
          border: 1px solid rgba(255,255,255,0.8);
          color: #52525b;
          box-shadow: var(--ai-shadow-sm);
        }

        /* ── Divider ────────────────────────────────────── */
        .ai-divider {
          height: 1px;
          background: rgba(255,255,255,0.6);
          border: none;
          margin: 0;
        }

        /* ── Loading shimmer ────────────────────────────── */
        .ai-shimmer {
          display: inline-block;
          width: 16px; height: 16px;
          border-radius: 50%;
          border: 2px solid rgba(30,64,175,0.3);
          border-top-color: #1e40af;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Background blobs */}
      <div className="absolute inset-0">
        <div className="absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-violet-300/60 blur-3xl" />
        <div className="absolute -right-20 top-10 h-[26rem] w-[26rem] rounded-full bg-fuchsia-200/70 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#ffffffb8,transparent_44%),linear-gradient(135deg,#f8f4ff,#ded3ff_52%,#f7f2ff)]" />
      </div>

      <div className="relative z-30">
        <Header />
      </div>

      <div className="ai-page-wrap">
        <div className="ai-card">

          {/* ── Page header ── */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="ai-label">EYES</div>
              <div className="ai-heading">Голосовой ассистент</div>
              <div className="ai-subtext">
                EyesAI для навигации, ориентирования и свободных запросов
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  background: canUseSTT ? "#22c55e" : "#f59e0b",
                  boxShadow: canUseSTT
                    ? "0 0 0 3px rgba(34,197,94,0.2)"
                    : "0 0 0 3px rgba(245,158,11,0.2)",
                }}
              />
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#71717a", letterSpacing: "0.06em" }}>
                {canUseSTT ? "STT готов" : "STT недоступен"}
              </span>
            </div>
          </div>

          <hr className="ai-divider mb-6" />

          {/* ── Mic orb ── */}
          <div className="ai-orb-wrap">
            {listening && (
              <>
                <div className="ai-orb-ring" />
                <div className="ai-orb-ring ai-orb-ring-2" />
              </>
            )}

            <button
              type="button"
              onClick={listening ? stopAll : startListening}
              disabled={!canUseSTT}
              className={`ai-orb ${listening ? "ai-orb--listening" : ""}`}
              aria-label={listening ? "Остановить" : "Начать говорить"}
            >
              {listening ? (
                /* Stop icon */
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
              ) : (
                /* Mic icon */
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              )}
            </button>

            {listening ? (
              <div className="ai-wave">
                {waveBars.map((_, i) => (
                  <div key={i} className="ai-wave-bar" />
                ))}
              </div>
            ) : (
              <div className="ai-orb-label">
                {canUseSTT ? "Нажми чтобы говорить" : "Речь недоступна"}
              </div>
            )}

            {listening && (
              <div className="ai-orb-label ai-orb-label--active">Слушаю...</div>
            )}
          </div>

          {/* ── Quick actions ── */}
          <div className="ai-actions mb-6">
            <button type="button" onClick={repeatAnswer} className="ai-btn ai-btn-ghost">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
              Повторить ответ
            </button>

            <button type="button" onClick={stopAll} className="ai-btn ai-btn-ghost">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
              </svg>
              Остановить
            </button>
          </div>

          {/* ── Commands pills ── */}
          <div className="ai-cmd-strip mb-6">
            {["построй маршрут", "где я", "повтори", "я хочу поесть рядом"].map((cmd) => (
              <div key={cmd} className="ai-cmd-pill">«{cmd}»</div>
            ))}
          </div>

          {/* ── Notifications ── */}
          <div className="space-y-3 mb-6">
            {!canUseSTT && (
              <div className="ai-notice ai-notice--warn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <span>Браузер не поддерживает распознавание речи. Используй Chrome или Edge.</span>
              </div>
            )}

            {hint && (
              <div className="ai-notice ai-notice--hint">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{hint}</span>
              </div>
            )}

            {error && (
              <div className="ai-notice ai-notice--error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {loading && (
              <div className="ai-notice ai-notice--loading">
                <span className="ai-shimmer" />
                <span>Обрабатываю запрос...</span>
              </div>
            )}
          </div>

          <hr className="ai-divider mb-6" />

          {/* ── Results grid ── */}
          <div className="ai-grid">

            {/* Recognized text */}
            <div className="ai-inner-card">
              <div className="ai-section-label">Распознано</div>
              <p className={`ai-section-text ${!userText ? "ai-section-text--empty" : ""}`}>
                {userText || "Ожидание голоса..."}
              </p>
            </div>

            {/* Mini AI */}
            <div className="ai-inner-card" style={{ background: "linear-gradient(135deg, rgba(237,233,255,0.65) 0%, rgba(255,255,255,0.5) 100%)", borderColor: "rgba(196,181,253,0.35)" }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="ai-dot" />
                <div className="ai-section-label" style={{ color: "var(--ai-purple)", marginBottom: 0 }}>Мини-ИИ</div>
              </div>
              <p className={`ai-section-text ${!miniAiText ? "ai-section-text--empty" : ""}`}>
                {miniAiText || "Краткий пересказ появится здесь..."}
              </p>
            </div>

            {/* Assistant answer */}
            <div className="ai-inner-card">
              <div className="ai-section-label">Ответ ассистента</div>
              <p className={`ai-section-text ${!assistantText ? "ai-section-text--empty" : ""}`}>
                {assistantText || "Пока пусто..."}
              </p>
              {assistantText && (
                <button
                  type="button"
                  onClick={repeatAnswer}
                  className="ai-btn ai-btn-dark mt-3 !text-xs !px-3 !py-2"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  </svg>
                  Озвучить
                </button>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}