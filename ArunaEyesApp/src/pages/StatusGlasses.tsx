import Header from "./Header";
import { useEsp32 } from "../features/esp32/Esp32Context";

export default function StatusGlasses() {
  const { connected, isOnline, deviceName, error, status } = useEsp32();

  const distance = status?.distance ?? null;
  const hasDistance = distance !== null && distance >= 0;
  const distancePercent = hasDistance ? Math.max(0, Math.min(100, 100 - distance)) : 0;

  return (
    <>
      <Header />

      <section className="relative min-h-screen overflow-hidden bg-[#efe9ff] text-zinc-950">
        <div className="absolute inset-0">
          <div className="absolute -left-28 -top-28 h-[30rem] w-[30rem] rounded-full bg-violet-300/60 blur-3xl" />
          <div className="absolute -right-24 top-20 h-[28rem] w-[28rem] rounded-full bg-fuchsia-200/70 blur-3xl" />
          <div className="absolute bottom-[-12rem] left-1/2 h-[30rem] w-[34rem] -translate-x-1/2 rounded-full bg-violet-300/40 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#ffffffc9,transparent_44%),linear-gradient(135deg,#f8f4ff,#ded3ff_52%,#f7f2ff)]" />
        </div>

        <main className="relative z-10 mx-auto max-w-7xl px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-white/75 bg-white/55 p-6 shadow-[0_30px_90px_rgba(75,45,130,.18)] backdrop-blur-2xl md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-violet-200/80 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-900">
                Device Monitoring
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
                Status Glasses
              </h1>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-white/65 px-4 py-3 shadow-sm ring-1 ring-white/70">
              <span
                className={`h-3 w-3 rounded-full ${
                  isOnline ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm font-black">
                {isOnline ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Подключение", connected ? "Включено" : "Выключено"],
              ["Устройство", isOnline ? `${deviceName}` : "—"],
              ["Расстояние", hasDistance ? `${distance} см` : "—"],
              ["Сетевой режим", status?.apMode ? "Setup AP" : isOnline ? "Normal" : "—"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[2rem] border border-white/75 bg-white/55 p-5 shadow-[0_24px_70px_rgba(75,45,130,.14)] backdrop-blur-2xl"
              >
                <div className="text-sm font-bold text-zinc-500">{label}</div>
                <div className="mt-3 text-2xl font-black text-zinc-950">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
            <section className="rounded-[2.2rem] border border-white/75 bg-white/58 p-6 shadow-[0_30px_90px_rgba(75,45,130,.18)] backdrop-blur-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">
                    Live Status
                  </div>
                  <h2 className="mt-1 text-2xl font-black">Основной статус</h2>
                </div>

                <div className="rounded-full bg-black px-4 py-2 text-xs font-black text-white">
                  ESP32 {isOnline ? "ON" : "OFF"}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  ["ESP32", isOnline ? "онлайн" : "оффлайн"],
                  ["Предупреждение", status?.warning || "—"],
                  ["Текущая команда", status?.command || "—"],
                  ["Следующая команда", status?.nextMode || "—"],
                  ["Wi-Fi", status?.wifiSsid || "—"],
                  ["IP", status?.ip || "—"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl bg-white/60 px-4 py-3 ring-1 ring-white/70"
                  >
                    <div className="text-xs font-black uppercase tracking-wide text-zinc-400">
                      {label}
                    </div>
                    <div className="mt-1 break-words text-sm font-bold text-zinc-900">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2.2rem] border border-white/75 bg-white/58 p-6 shadow-[0_30px_90px_rgba(75,45,130,.18)] backdrop-blur-2xl">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">
                Obstacle
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-sm font-bold text-zinc-500">
                    Расстояние до объекта
                  </div>
                  <div className="mt-2 text-5xl font-black text-zinc-950">
                    {hasDistance ? distance : "—"}
                    {hasDistance ? (
                      <span className="ml-2 text-xl text-zinc-500">см</span>
                    ) : null}
                  </div>
                </div>

                <div
                  className={`rounded-full px-4 py-2 text-xs font-black ${
                    hasDistance && distance < 20
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {hasDistance && distance < 20 ? "DANGER" : "SAFE"}
                </div>
              </div>

              <div className="mt-7 h-4 overflow-hidden rounded-full bg-white/70 ring-1 ring-white/70">
                <div
                  className="h-full rounded-full bg-black transition-all duration-500"
                  style={{ width: `${distancePercent}%` }}
                />
              </div>

              <div className="mt-6 rounded-2xl bg-white/60 p-4 text-sm leading-6 text-zinc-700 ring-1 ring-white/70">
                При расстоянии меньше 20 см приложение автоматически озвучивает
                предупреждение о препятствии.
              </div>
            </section>
          </div>

          <section className="mt-5 rounded-[2.2rem] border border-white/75 bg-white/58 p-6 shadow-[0_30px_90px_rgba(75,45,130,.18)] backdrop-blur-2xl">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">
              Logic
            </div>
            <h2 className="mt-1 text-2xl font-black">Интерпретация состояния</h2>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-white/60 p-4 text-sm leading-6 text-zinc-700 ring-1 ring-white/70">
                Кнопка на очках по очереди отправляет команды{" "}
                <b>WHERE_AM_I</b> и <b>BUILD_ROUTE</b>.
              </div>
              <div className="rounded-2xl bg-white/60 p-4 text-sm leading-6 text-zinc-700 ring-1 ring-white/70">
                Если сеть пропадёт, ESP32 сможет перейти в режим точки доступа{" "}
                <b>ArunaEyes_Setup</b>.
              </div>
              <div className="rounded-2xl bg-white/60 p-4 text-sm leading-6 text-zinc-700 ring-1 ring-white/70">
                Статус обновляется из контекста ESP32 без изменения основной
                логики приложения.
              </div>
            </div>
          </section>

          {error ? (
            <div className="mt-5 rounded-[2rem] border border-red-200 bg-red-100/80 p-5 text-sm font-bold text-red-700 shadow-xl backdrop-blur-2xl">
              Ошибка: {error}
            </div>
          ) : null}
        </main>
      </section>
    </>
  );
}