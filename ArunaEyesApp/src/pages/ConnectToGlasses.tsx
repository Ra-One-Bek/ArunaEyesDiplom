import Header from "./Header";
import { useEsp32 } from "../features/esp32/Esp32Context";

export default function ConnectToGlasses() {
  const {
    esp32Url,
    setEsp32Url,
    connected,
    connect,
    disconnect,
    reconnect,
    startSetupMode,
    openSetupPortal,
    isOnline,
    deviceName,
    error,
    status,
  } = useEsp32();

  async function handleStartSetup() {
    const ok = await startSetupMode();
    if (ok) {
      alert(
        "Очки переходят в режим настройки. Подключитесь к сети ArunaEyes_Setup и откройте http://192.168.4.1"
      );
    } else {
      alert("Не удалось перевести очки в режим настройки.");
    }
  }

  function useLocalAddress() {
    setEsp32Url("http://arunaeyes.local");
  }

  return (
    <>
      <Header />

      <section className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="mb-8 rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <div className="mb-3 inline-flex rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-sm text-violet-200">
              Device Setup
            </div>
            <h1 className="text-3xl font-black sm:text-4xl">
              Connect to Glasses
            </h1>
            <p className="mt-3 max-w-3xl text-slate-300">
              Настройка подключения очков, смена сети Wi-Fi и управление
              соединением.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h2 className="text-xl font-bold">Настройка Wi-Fi</h2>

              <div className="mt-4 space-y-3 text-slate-300">
                <p>1. Подключитесь к сети <b>ArunaEyes_Setup</b></p>
                <p>2. Откройте в браузере <b>http://192.168.4.1</b></p>
                <p>3. Введите название Wi-Fi и пароль</p>
                <p>4. После перезапуска очки подключатся к вашей сети</p>
                <p>5. Затем используйте адрес <b>http://arunaeyes.local</b></p>
                <p>
                  Если адрес <b>.local</b> не открывается, используйте резервный
                  IP с локальной страницы очков
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={openSetupPortal}
                  className="rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700"
                >
                  Open setup portal
                </button>

                <button
                  onClick={handleStartSetup}
                  className="rounded-2xl bg-amber-600 px-5 py-3 font-semibold text-white transition hover:bg-amber-700"
                >
                  Change Wi-Fi
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h2 className="text-xl font-bold">Подключение к очкам</h2>

              <div className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
                <div className="text-sm text-sky-200">Рекомендуемый адрес</div>
                <div className="mt-2 text-lg font-bold text-white">
                  http://arunaeyes.local
                </div>
                <div className="mt-3">
                  <button
                    onClick={useLocalAddress}
                    className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                  >
                    Использовать .local
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Адрес очков
                </label>
                <input
                  value={esp32Url}
                  onChange={(e) => setEsp32Url(e.target.value)}
                  placeholder="http://arunaeyes.local или http://192.168.1.71"
                  className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500"
                />
                <div className="mt-2 text-sm text-slate-500">
                  Сначала попробуйте .local. Если не работает, вставьте IP с
                  локальной страницы очков.
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={connect}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
                >
                  Подключиться
                </button>

                <button
                  onClick={disconnect}
                  className="rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white transition hover:bg-rose-700"
                >
                  Отключиться
                </button>

                <button
                  onClick={reconnect}
                  className="rounded-2xl bg-sky-600 px-5 py-3 font-semibold text-white transition hover:bg-sky-700"
                >
                  Переподключиться
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="text-sm text-slate-400">Устройство</div>
              <div className="mt-2 text-xl font-bold text-white">
                {isOnline ? `${deviceName} подключены` : "Очки не подключены"}
              </div>
              <div className="mt-3 text-slate-300">
                Режим: {connected ? "подключение включено" : "подключение выключено"}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="text-sm text-slate-400">Сеть</div>
              <div className="mt-2 text-xl font-bold text-white">
                {status?.wifiSsid || "—"}
              </div>
              <div className="mt-3 text-slate-300">
                IP: {status?.ip || "—"}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="text-sm text-slate-400">Состояние</div>
              <div className="mt-2 text-xl font-bold text-white">
                {isOnline ? "Онлайн" : "Оффлайн"}
              </div>
              <div className="mt-3 text-slate-300">
                {status?.apMode ? "Очки в режиме настройки" : "Очки в обычном режиме"}
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