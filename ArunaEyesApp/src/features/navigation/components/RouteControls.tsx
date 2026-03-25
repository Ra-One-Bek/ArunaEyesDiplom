export function RouteControls({
  canBuild,
  hasRoute,
  onBuild,
  onStart,
  onSpeak,
}: {
  canBuild: boolean;
  hasRoute: boolean;
  onBuild: () => void;
  onStart: () => void;
  onSpeak: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      <button
        type="button"
        onClick={onBuild}
        disabled={!canBuild}
        className={[
          "w-full rounded-xl px-3 py-2 text-sm font-semibold transition",
          canBuild ? "bg-slate-900 text-white hover:bg-slate-800" : "cursor-not-allowed bg-slate-200 text-slate-500",
        ].join(" ")}
      >
        🗺 Построить маршрут
      </button>

      <button
        type="button"
        onClick={onStart}
        disabled={!hasRoute}
        className={[
          "w-full rounded-xl px-3 py-2 text-sm font-semibold transition",
          hasRoute ? "bg-emerald-600 text-white hover:bg-emerald-700" : "cursor-not-allowed bg-slate-200 text-slate-500",
        ].join(" ")}
      >
        ▶ Начать навигацию
      </button>

      <button
        type="button"
        onClick={onSpeak}
        disabled={!hasRoute}
        className={[
          "w-full rounded-xl px-3 py-2 text-sm font-semibold transition",
          hasRoute ? "bg-indigo-600 text-white hover:bg-indigo-700" : "cursor-not-allowed bg-slate-200 text-slate-500",
        ].join(" ")}
      >
        🔊 Озвучить шаг
      </button>
    </div>
  );
}