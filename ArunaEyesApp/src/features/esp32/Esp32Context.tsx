import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { getLastSpokenText, speakRu } from "../navigation/tts";

type Esp32Command = "WHERE_AM_I" | "BUILD_ROUTE" | "REPEAT" | "" | null;

type Esp32Status = {
  distance: number | null;
  warning: string;
  command: string;
  buttonEvent: boolean;
  nextMode: string;
  wifiSsid: string;
  ip: string;
  apMode: boolean;
};

type Esp32ContextType = {
  esp32Url: string;
  setEsp32Url: (value: string) => void;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  startSetupMode: () => Promise<boolean>;
  openSetupPortal: () => void;
  isOnline: boolean;
  deviceName: string;
  error: string | null;
  status: Esp32Status | null;
};

const Esp32Context = createContext<Esp32ContextType | null>(null);

const DEFAULT_ESP32_URL =
  localStorage.getItem("eyesapp:esp32Url") || "http://arunaeyes.local";

const OBSTACLE_DISTANCE_CM = 20;
const OBSTACLE_COOLDOWN_MS = 3000;

export function Esp32Provider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const [esp32Url, setEsp32UrlState] = useState(DEFAULT_ESP32_URL);
  const [connected, setConnected] = useState(
    localStorage.getItem("eyesapp:esp32Connected") === "true"
  );
  const [status, setStatus] = useState<Esp32Status | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [deviceName] = useState("ESP32-CAM");
  const [error, setError] = useState<string | null>(null);

  const busyRef = useRef(false);
  const initializedRef = useRef(false);
  const announcedOnlineRef = useRef(false);
  const lastObstacleSpeakRef = useRef(0);

  const setEsp32Url = useCallback((value: string) => {
    setEsp32UrlState(value);
    localStorage.setItem("eyesapp:esp32Url", value);
  }, []);

  const connect = useCallback(() => {
    localStorage.setItem("eyesapp:esp32Connected", "true");
    setConnected(true);
  }, []);

  const disconnect = useCallback(() => {
    localStorage.setItem("eyesapp:esp32Connected", "false");
    setConnected(false);
    setStatus(null);
    setIsOnline(false);
    setError(null);
    announcedOnlineRef.current = false;
  }, []);

  const reconnect = useCallback(() => {
    localStorage.setItem("eyesapp:esp32Connected", "true");
    setConnected(false);
    setStatus(null);
    setIsOnline(false);
    setError(null);
    announcedOnlineRef.current = false;

    setTimeout(() => {
      setConnected(true);
    }, 200);
  }, []);

  const openSetupPortal = useCallback(() => {
    window.open("http://192.168.4.1", "_blank");
  }, []);

  const startSetupMode = useCallback(async () => {
    try {
      const res = await fetch(`${esp32Url}/startsetup`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Setup HTTP ${res.status}`);
      }

      return true;
    } catch {
      return false;
    }
  }, [esp32Url]);

  function repeatLastMessage() {
    const lastMessage = getLastSpokenText();
    if (!lastMessage.trim()) {
      speakRu("Пока нет подсказки, которую можно повторить.");
      return;
    }
    speakRu(lastMessage);
  }

  useEffect(() => {
    if (!connected || !esp32Url.trim()) return;

    let timerId: number | null = null;
    let stopped = false;

    const poll = async () => {
      if (busyRef.current) return;
      busyRef.current = true;

      try {
        const [statusRes, commandRes] = await Promise.all([
          fetch(`${esp32Url}/status`, { cache: "no-store" }),
          fetch(`${esp32Url}/command`, { cache: "no-store" }),
        ]);

        if (!statusRes.ok) throw new Error(`Status HTTP ${statusRes.status}`);
        if (!commandRes.ok) throw new Error(`Command HTTP ${commandRes.status}`);

        const statusJson = await statusRes.json();
        const commandText = (await commandRes.text()).trim().toUpperCase();

        const normalizedStatus: Esp32Status = {
          distance:
            typeof statusJson.distance_cm === "number"
              ? statusJson.distance_cm
              : null,
          warning:
            typeof statusJson.warning_text === "string"
              ? statusJson.warning_text
              : "",
          command:
            typeof statusJson.command === "string" ? statusJson.command : "",
          buttonEvent: Boolean(statusJson.button_event),
          nextMode:
            typeof statusJson.next_mode === "string" ? statusJson.next_mode : "",
          wifiSsid:
            typeof statusJson.wifi_ssid === "string"
              ? statusJson.wifi_ssid
              : "",
          ip: typeof statusJson.ip === "string" ? statusJson.ip : "",
          apMode: Boolean(statusJson.ap_mode),
        };

        setStatus(normalizedStatus);
        setIsOnline(true);
        setError(null);

        if (!announcedOnlineRef.current) {
          announcedOnlineRef.current = true;
          speakRu(`Привет, я Eyes. ${deviceName} подключены. Чем могу помочь?`);
        }

        if (
          typeof normalizedStatus.distance === "number" &&
          normalizedStatus.distance >= 0 &&
          normalizedStatus.distance < OBSTACLE_DISTANCE_CM
        ) {
          const now = Date.now();
          if (now - lastObstacleSpeakRef.current >= OBSTACLE_COOLDOWN_MS) {
            lastObstacleSpeakRef.current = now;
            speakRu("Осторожно, впереди препятствие");
          }
        }

        if (!initializedRef.current) {
          initializedRef.current = true;
          return;
        }

        if (normalizedStatus.buttonEvent && commandText) {
          const cmd = commandText as Esp32Command;

          if (cmd === "WHERE_AM_I") {
            speakRu("Показываю, где вы находитесь.");
            navigate("/nav?mode=where");
          } else if (cmd === "BUILD_ROUTE") {
            speakRu("Открываю навигацию.");
            navigate("/nav?mode=voice-route");
          } else if (cmd === "REPEAT") {
            repeatLastMessage();
          }
        }
      } catch (err: any) {
        setIsOnline(false);
        setError(err?.message ?? "EyesGlasses недоступен");
        announcedOnlineRef.current = false;
      } finally {
        busyRef.current = false;
      }
    };

    void poll();

    timerId = window.setInterval(() => {
      if (!stopped) void poll();
    }, 1000);

    return () => {
      stopped = true;
      if (timerId) window.clearInterval(timerId);
    };
  }, [connected, esp32Url, navigate, deviceName]);

  return (
    <Esp32Context.Provider
      value={{
        esp32Url,
        setEsp32Url,
        connected,
        connect,
        disconnect,
        reconnect,
        startSetupMode,
        openSetupPortal,
        isOnline,
        deviceName,
        error,
        status,
      }}
    >
      {children}
    </Esp32Context.Provider>
  );
}

export function useEsp32() {
  const ctx = useContext(Esp32Context);
  if (!ctx) {
    throw new Error("useEsp32 must be used inside Esp32Provider");
  }
  return ctx;
}