type CityMode = "astana" | "almaty" | "any";

export function RouteForm({
  from,
  to,
  onFromChange,
  onToChange,
  cityMode,
  setCityMode,
}: {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  cityMode: CityMode;
  setCityMode: (v: CityMode) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Откуда
        </label>
        <input
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Куда
        </label>
        <input
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Город
        </label>
        <select
          value={cityMode}
          onChange={(e) => setCityMode(e.target.value as CityMode)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2"
        >
          <option value="astana">Астана</option>
          <option value="almaty">Алматы</option>
          <option value="any">Все города</option>
        </select>
      </div>
    </div>
  );
}