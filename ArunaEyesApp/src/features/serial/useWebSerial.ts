import { useCallback, useRef, useState } from "react";

export type SerialState = "disconnected" | "connected" | "listening";

function makeLineBreakTransformer() {
  let buffer = "";
  return new TransformStream<string, string>({
    transform(chunk, controller) {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) controller.enqueue(line.replace(/\r/g, ""));
    },
    flush(controller) {
      if (buffer) controller.enqueue(buffer.replace(/\r/g, ""));
    },
  });
}

export function useWebSerial(baudRate = 9600) {
  const [state, setState] = useState<SerialState>("disconnected");
  const [lastLine, setLastLine] = useState("");

  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const stopFlagRef = useRef(false);

  const supported = typeof navigator !== "undefined" && "serial" in navigator;

  const connect = useCallback(async () => {
    if (!supported) throw new Error("Web Serial не поддерживается.");

    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate });

    portRef.current = port;
    setState("connected");
  }, [baudRate, supported]);

  const disconnect = useCallback(async () => {
    stopFlagRef.current = true;

    try {
      await readerRef.current?.cancel();
    } catch {}

    readerRef.current = null;

    try {
      await portRef.current?.close();
    } catch {}

    portRef.current = null;
    setState("disconnected");
  }, []);

  const start = useCallback(async (onLine: (line: string) => void) => {
    const port = portRef.current;
    if (!port) throw new Error("Сначала подключись к порту.");
    if (!port.readable) throw new Error("У порта нет readable потока.");

    stopFlagRef.current = false;

    const textStream = port.readable
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(makeLineBreakTransformer());

    const reader = textStream.getReader();
    readerRef.current = reader;
    setState("listening");

    try {
      while (!stopFlagRef.current) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        const line = value.trim();
        if (!line) continue;

        setLastLine(line);
        onLine(line);
      }
    } finally {
      try {
        await reader.cancel();
      } catch {}

      readerRef.current = null;
      setState(portRef.current ? "connected" : "disconnected");
    }
  }, []);

  const stop = useCallback(async () => {
    stopFlagRef.current = true;

    try {
      await readerRef.current?.cancel();
    } catch {}

    readerRef.current = null;
    setState(portRef.current ? "connected" : "disconnected");
  }, []);

  return {
    supported,
    state,
    lastLine,
    connect,
    start,
    stop,
    disconnect,
  };
}