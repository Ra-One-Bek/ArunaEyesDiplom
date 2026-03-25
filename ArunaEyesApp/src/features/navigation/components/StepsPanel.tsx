import type { RouteResult, RouteStep } from "../types";

function getManeuverKind(instruction: string) {
  const t = instruction.toLowerCase();
  if (t.includes("прибы") || t.includes("назначен") || t.includes("финиш")) return "arrive";
  if (t.includes("выйдите") || t.includes("старт") || t.includes("начните")) return "depart";
  if (t.includes("налево") || t.includes("левее")) return "left";
  if (t.includes("направо") || t.includes("правее")) return "right";
  if (t.includes("разворот") || t.includes("развернит")) return "uturn";
  if (t.includes("прямо") || t.includes("продолжайте")) return "straight";
  if (t.includes("круг") || t.includes("кольц")) return "roundabout";
  return "other";
}

function ManeuverIcon({ kind }: { kind: ReturnType<typeof getManeuverKind> }) {
  const common = "grid h-9 w-9 place-items-center rounded-xl ring-1 font-semibold";
  switch (kind) {
    case "depart":
      return <div className={`${common} bg-blue-50 text-blue-700 ring-blue-100`}>🚶</div>;
    case "arrive":
      return <div className={`${common} bg-emerald-50 text-emerald-700 ring-emerald-100`}>🏁</div>;
    case "left":
      return <div className={`${common} bg-amber-50 text-amber-700 ring-amber-100`}>↶</div>;
    case "right":
      return <div className={`${common} bg-amber-50 text-amber-700 ring-amber-100`}>↷</div>;
    case "uturn":
      return <div className={`${common} bg-rose-50 text-rose-700 ring-rose-100`}>⤾</div>;
    case "straight":
      return <div className={`${common} bg-slate-50 text-slate-700 ring-slate-200`}>↑</div>;
    case "roundabout":
      return <div className={`${common} bg-violet-50 text-violet-700 ring-violet-100`}>⟲</div>;
    default:
      return <div className={`${common} bg-slate-50 text-slate-700 ring-slate-200`}>➜</div>;
  }
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
      {children}
    </span>
  );
}

export function StepsPanel({
  route,
  activeStep,
  activeStepIndex,
  isNavigating,
  onPickStep,
}: {
  route: RouteResult | null;
  activeStep: RouteStep | null;
  activeStepIndex: number;
  isNavigating: boolean;
  onPickStep: (idx: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-slate-900">Шаги маршрута</div>
          <div className="text-sm text-slate-600">
            {route ? "Выберите шаг или следуйте по порядку" : "Постройте маршрут, чтобы увидеть шаги"}
          </div>
        </div>

        {route ? (
          <span
            className={[
              "rounded-full px-3 py-1 text-xs font-medium ring-1",
              isNavigating
                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                : "bg-slate-50 text-slate-700 ring-slate-200",
            ].join(" ")}
          >
            {isNavigating ? "Навигация" : "Просмотр"}
          </span>
        ) : null}
      </div>

      {!route ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div className="text-sm font-semibold text-slate-900">Маршрут ещё не построен</div>
          <div className="mt-1 text-sm text-slate-600">
            Введите “Откуда” и “Куда”, затем нажмите “Построить маршрут”.
          </div>
        </div>
      ) : (
        <>
          {activeStep ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <ManeuverIcon kind={getManeuverKind(activeStep.instruction)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-slate-900">
                      Сейчас: шаг {activeStepIndex + 1}/{route.steps.length}
                    </div>
                    <Chip>{activeStep.distance}</Chip>
                    <Chip>{activeStep.duration}</Chip>
                  </div>
                  <div className="mt-1 text-sm text-slate-800">{activeStep.instruction}</div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-200">
              {route.steps.map((s, idx) => {
                const isActive = idx === activeStepIndex;
                const kind = getManeuverKind(s.instruction);

                return (
                  <li key={s.id} className="relative">
                    {/* timeline line */}
                    <div className="absolute left-6 top-0 h-full w-px bg-slate-200" />
                    {/* timeline dot */}
                    <div
                      className={[
                        "absolute left-[18px] top-6 h-4 w-4 rounded-full ring-4",
                        isActive ? "bg-slate-900 ring-slate-200" : "bg-white ring-slate-200",
                      ].join(" ")}
                    />

                    <button
                      type="button"
                      onClick={() => onPickStep(idx)}
                      className={[
                        "w-full p-4 text-left transition",
                        isActive ? "bg-slate-900 text-white" : "hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <div className="ml-8">
                          <ManeuverIcon kind={kind} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={["text-sm font-semibold", isActive ? "text-white" : "text-slate-900"].join(" ")}>
                                {idx + 1}. {isActive ? "Текущий шаг" : "Шаг"}
                              </div>
                              {isActive ? (
                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs ring-1 ring-white/20">
                                  NOW
                                </span>
                              ) : null}
                            </div>

                            <div className={["flex items-center gap-2 text-xs", isActive ? "text-white/90" : "text-slate-600"].join(" ")}>
                              <span className={["rounded-full px-2 py-1 ring-1", isActive ? "bg-white/10 ring-white/20" : "bg-slate-50 ring-slate-200"].join(" ")}>
                                {s.distance}
                              </span>
                              <span className={["rounded-full px-2 py-1 ring-1", isActive ? "bg-white/10 ring-white/20" : "bg-slate-50 ring-slate-200"].join(" ")}>
                                {s.duration}
                              </span>
                            </div>
                          </div>

                          <div className={["mt-1 text-sm", isActive ? "text-white/90" : "text-slate-700"].join(" ")}>
                            {s.instruction}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}