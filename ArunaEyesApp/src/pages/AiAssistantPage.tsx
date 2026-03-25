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
  | { type: "unknown"; raw: string };

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/ё/g, "е");
}

function parseCommand(text: string): Command {
  const t = normalize(text);

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

      if (isFinal) {
        void handleFinalTranscript(transcript);
      }
    };

    rec.onerror = (e: any) => {
      setError(`Ошибка распознавания речи: ${e?.error ?? "unknown"}`);
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

  function startListening() {
    setError(null);
    setHint(
      "Скажи: «построй маршрут», «повтори», «где я» или свободный запрос, например: «я хочу поесть рядом»",
    );
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

    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }

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
            const response = await fetch(`${API_BASE}/assistant/query`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text,
                latitude,
                longitude,
              }),
            });

            if (!response.ok) {
              throw new Error("Не удалось обработать запрос ассистента.");
            }

            const data = await response.json();

            setAssistantText(data.text ?? "Запрос обработан.");
            speakRu(data.text ?? "Запрос обработан.");

            console.log("assistant/query response:", data);
          } catch (err: any) {
            const msg =
              err?.message ?? "Ошибка при обращении к ассистенту.";
            setAssistantText(msg);
            speakRu(msg);
          } finally {
            resolve();
          }
        },
        () => {
          const msg =
            "Не получилось получить местоположение. Проверь разрешение геолокации.";
          setAssistantText(msg);
          speakRu(msg);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    });
  }

  async function handleFinalTranscript(transcript: string) {
    setHint(null);

    const cmd = parseCommand(transcript);

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
      const msg =
        "Открываю экран навигации. Скажи «маршрут точка А до точка Б» или введи адреса вручную.";
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
              if (place.housenumber) {
                msg += `, дом ${place.housenumber}`;
              }
            } else {
              msg = "Не удалось определить точный адрес.";
            }

            setAssistantText(msg);
            speakRu(msg);
          } catch (e) {
            console.error("AiAssistantPage where_am_i error:", e);
            const msg = "Не удалось определить адрес.";
            setAssistantText(msg);
            speakRu(msg);
          }
        },
        () => {
          const msg =
            "Не получилось получить местоположение. Проверь разрешение геолокации.";
          setAssistantText(msg);
          speakRu(msg);
        },
        { enableHighAccuracy: true, timeout: 8000 },
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-2xl font-semibold text-slate-900">
            Голосовой ассистент
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Ограниченный мини-ИИ для функций приложения и свободных запросов,
            связанных с навигацией и ориентированием.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startListening}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Начать говорить
            </button>

            <button
              type="button"
              onClick={repeatAnswer}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Повторить ответ
            </button>

            <button
              type="button"
              onClick={stopAll}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Остановить
            </button>
          </div>

          {!canUseSTT ? (
            <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100">
              Браузер не поддерживает распознавание речи. Лучше использовать
              Chrome или Edge.
            </div>
          ) : null}

          {listening ? (
            <div className="mt-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-sky-100">
              Слушаю...
            </div>
          ) : null}

          {hint ? (
            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
              {hint}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <section className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">
                Распознанный текст
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                {userText ? userText : "Пока пусто..."}
              </p>
            </section>

            <section className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">
                Краткий пересказ мини-ИИ
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                {miniAiText ? miniAiText : "Пока пусто..."}
              </p>
            </section>

            <section className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">
                Ответ ассистента
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                {assistantText ? assistantText : "Пока пусто..."}
              </p>
            </section>
          </div>

          <div className="mt-6 text-xs text-slate-500">
            Ассистент понимает команды: навигация, местоположение, повтор
            подсказки, а также свободные запросы вроде «я хочу поесть рядом».
          </div>
        </div>
      </div>
    </div>
  );
}