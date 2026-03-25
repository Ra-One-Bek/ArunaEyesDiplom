import type { SerialState } from "./useWebSerial";

export function SerialStatusBadge({ state }: { state: SerialState }) {
  const isOn = state === "connected" || state === "listening";
  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1",
        isOn ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-slate-50 text-slate-700 ring-slate-200",
      ].join(" ")}
    >
      <span className={["h-2 w-2 rounded-full", isOn ? "bg-emerald-500" : "bg-slate-400"].join(" ")} />
      {isOn ? "Подключено" : "Не подключено"}
    </div>
  );
}