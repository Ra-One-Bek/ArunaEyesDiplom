import type { RouteResult } from "../types";

export function RouteSummary({
  route,
  isNavigating,
  activeStepIndex,
  onPrev,
  onNext,
  onStop,
}: {
  route: RouteResult;
  isNavigating: boolean;
  activeStepIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onStop: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="text-sm font-semibold text-slate-900">
        {route.from} → {route.to}
      </div>

      <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
        <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">{route.totalDistance}</span>
        <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">{route.totalDuration}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={activeStepIndex === 0}
          className={[
            "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition",
            activeStepIndex === 0
              ? "cursor-not-allowed bg-slate-200 text-slate-500"
              : "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100",
          ].join(" ")}
        >
          ← Назад
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={activeStepIndex >= route.steps.length - 1}
          className={[
            "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition",
            activeStepIndex >= route.steps.length - 1
              ? "cursor-not-allowed bg-slate-200 text-slate-500"
              : "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100",
          ].join(" ")}
        >
          Далее →
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
        <span>
          Шаг {route.steps.length ? activeStepIndex + 1 : 0}/{route.steps.length}
        </span>

        {isNavigating ? (
          <button
            type="button"
            onClick={onStop}
            className="rounded-lg bg-white px-2 py-1 font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
          >
            ⏹ Стоп
          </button>
        ) : (
          <span className="rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">режим: просмотр</span>
        )}
      </div>
    </div>
  );
}