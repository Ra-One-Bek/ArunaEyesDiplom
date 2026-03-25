import { useEffect, useRef, useState } from "react";

export type Esp32Command =
  | "WHERE_AM_I"
  | "BUILD_ROUTE"
  | "REPEAT"
  | ""
  | null;

export type Esp32Status = {
  distance: number | null;
  warning: string;
  command: string;
  buttonEvent: boolean;
};

type UseEsp32PollOptions = {
  baseUrl: string;
  intervalMs?: number;
  enabled?: boolean;
};

export function useEsp32Poll({
  baseUrl,
  intervalMs = 1000,
  enabled = true,
}: UseEsp32PollOptions) {
  const [status, setStatus] = useState<Esp32Status | null>(null);
  const [command, setCommand] = useState<Esp32Command>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [deviceName, setDeviceName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const busyRef = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !baseUrl.trim()) return;

    let timerId: number | null = null;
    let stopped = false;

    const poll = async () => {
      if (busyRef.current) return;
      busyRef.current = true;

      try {
        const [statusRes, commandRes] = await Promise.all([
          fetch(`${baseUrl}/status`, { cache: "no-store" }),
          fetch(`${baseUrl}/command`, { cache: "no-store" }),
        ]);

        if (!statusRes.ok) {
          throw new Error(`Status HTTP ${statusRes.status}`);
        }

        if (!commandRes.ok) {
          throw new Error(`Command HTTP ${commandRes.status}`);
        }

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
            typeof statusJson.command === "string"
              ? statusJson.command
              : "",
          buttonEvent: Boolean(statusJson.button_event),
        };

        setStatus(normalizedStatus);
        setIsOnline(true);
        setDeviceName("ESP32-CAM");
        setError(null);

        // При самой первой загрузке НЕ запускаем команду
        if (!initializedRef.current) {
          initializedRef.current = true;
        } else {
          // Команду запускаем только если было событие кнопки
          if (normalizedStatus.buttonEvent && commandText) {
            setCommand(commandText as Esp32Command);
          }
        }
      } catch (err: any) {
        setIsOnline(false);
        setError(err?.message ?? "ESP32 недоступен");
      } finally {
        busyRef.current = false;
      }
    };

    void poll();

    timerId = window.setInterval(() => {
      if (!stopped) void poll();
    }, intervalMs);

    return () => {
      stopped = true;
      if (timerId) window.clearInterval(timerId);
    };
  }, [baseUrl, intervalMs, enabled]);

  const clearCommand = () => {
    setCommand(null);
  };

  return {
    status,
    command,
    isOnline,
    deviceName,
    error,
    clearCommand,
  };
}