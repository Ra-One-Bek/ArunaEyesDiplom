import Header from "./Header";
import { useEsp32 } from "../features/esp32/Esp32Context";

export default function StatusGlasses() {
  const { connected, isOnline, deviceName, error, status } = useEsp32();

  const distance = status?.distance ?? null;

  return (
    <>
      <Header />

      <section className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="mb-8 rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <div className="mb-3 inline-flex rounded-full border border-sky-400/20 bg-sky-500/10 px-4 py-2 text-sm text-sky-200">
              Device Monitoring
            </div>
            <h1 className="text-3xl font-black sm:text-4xl">Status Glasses</h1>
            <p className="mt-3 max-w-3xl text-slate-300">
              Рабочий экран состояния умных очков: связь с ESP32, расстояние до
              препятствия, текущая команда и сетевой режим.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="text-sm text-slate-400">Подключение</div>
              <div className="mt-2 text-2xl font-bold text-white">
                {connected ? "Включено" : "Выключено"}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="text-sm text-slate-400">Устройство</div>
              <div className="mt-2 text-2xl font-bold text-white">
                {isOnline ? `${deviceName}` : "—"}
              </div>
              <div className="mt-2 text-slate-300">
                {isOnline ? "Подключена" : "Нет подключения"}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="text-sm text-slate-400">Расстояние</div>
              <div className="mt-2 text-2xl font-bold text-white">
                {distance === null || distance < 0 ? "—" : `${distance} см`}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="text-sm text-slate-400">Сетевой режим</div>
              <div className="mt-2 text-2xl font-bold text-white">
                {status?.apMode ? "Setup AP" : isOnline ? "Normal" : "—"}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h2 className="text-xl font-bold">Основной статус</h2>

              <div className="mt-5 space-y-4 text-slate-300">
                <div>
                  <span className="font-medium text-white">ESP32:</span>{" "}
                  {isOnline ? "онлайн" : "оффлайн"}
                </div>

                <div>
                  <span className="font-medium text-white">Предупреждение:</span>{" "}
                  {status?.warning || "—"}
                </div>

                <div>
                  <span className="font-medium text-white">Текущая команда:</span>{" "}
                  {status?.command || "—"}
                </div>

                <div>
                  <span className="font-medium text-white">Следующая команда кнопки:</span>{" "}
                  {status?.nextMode || "—"}
                </div>

                <div>
                  <span className="font-medium text-white">Wi-Fi:</span>{" "}
                  {status?.wifiSsid || "—"}
                </div>

                <div>
                  <span className="font-medium text-white">IP:</span>{" "}
                  {status?.ip || "—"}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h2 className="text-xl font-bold">Интерпретация состояния</h2>

              <div className="mt-5 space-y-4 text-slate-300 leading-7">
                <p>
                  При расстоянии меньше 20 см приложение автоматически озвучивает
                  предупреждение о препятствии.
                </p>
                <p>
                  Кнопка на очках по очереди отправляет команды
                  <b> WHERE_AM_I</b> и <b>BUILD_ROUTE</b>.
                </p>
                <p>
                  Если сеть пропадёт, ESP32 сможет перейти в режим точки доступа
                  <b> ArunaEyes_Setup</b> для повторной настройки.
                </p>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-[24px] border border-rose-500/20 bg-rose-500/10 p-5 text-rose-200">
              Ошибка: {error}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}