import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

type Ctx = {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
};

const WakeContext = createContext<Ctx>({
  enabled: false,
  setEnabled: () => {},
});

export function useWakeWord() {
  return useContext(WakeContext);
}

function speak(text: string) {
  speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);

  u.lang = "ru-RU";

  speechSynthesis.speak(u);
}

function normalize(t: string) {
  return t.toLowerCase().trim();
}

export function VoiceWakeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();

  const [enabled, setEnabled] = useState(false);

  const listening = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SR) return;

    const rec = new SR();

    rec.lang = "ru-RU";

    rec.continuous = true;

    rec.interimResults = false;

    rec.onresult = (e: any) => {
      const text =
        e.results[e.results.length - 1][0].transcript;

      const cmd = normalize(text);

      if (
        cmd.includes("айс") ||
        cmd.includes("eyes")
      ) {
        if (listening.current) return;

        listening.current = true;

        speak("Слушаю");

        setTimeout(() => {
          listening.current = false;
        }, 6000);

        return;
      }

      if (!listening.current) return;

      if (
        cmd.includes("включи музыку")
      ) {
        navigate("/music?autoplay=1");

        speak("Включаю музыку");

        listening.current = false;

        return;
      }

      if (
        cmd.includes(
          "сколько сейчас времени"
        )
      ) {
        const now =
          new Date().toLocaleTimeString(
            "ru-RU",
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          );

        speak(`Сейчас ${now}`);

        listening.current = false;

        return;
      }
    };

    rec.onend = () => {
      if (enabled) {
        try {
          rec.start();
        } catch {}
      }
    };

    try {
      rec.start();
    } catch {}

    return () => {
      try {
        rec.stop();
      } catch {}
    };
  }, [enabled, navigate]);

  return (
    <WakeContext.Provider
      value={{
        enabled,
        setEnabled,
      }}
    >
      {children}
    </WakeContext.Provider>
  );
}