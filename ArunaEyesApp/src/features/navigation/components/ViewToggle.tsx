import type { ViewMode } from "../types";

export function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const base = "rounded-xl px-3 py-2 text-sm font-medium transition";
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange("map")}
        className={[
          base,
          view === "map"
            ? "bg-slate-900 text-white"
            : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100",
        ].join(" ")}
      >
        Карта
      </button>
      <button
        type="button"
        onClick={() => onChange("steps")}
        className={[
          base,
          view === "steps"
            ? "bg-slate-900 text-white"
            : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100",
        ].join(" ")}
      >
        Шаги
      </button>

      <button onClick={() => onChange("glasses")}>
        Очки
      </button>
    </div>
  );
}