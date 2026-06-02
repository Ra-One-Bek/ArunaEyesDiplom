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
                Device Setup
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
                Connect to Glasses
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

          <div className="grid gap-5 lg:grid-cols-[.95fr_1.05fr]">
            <section className="rounded-[2.2rem] border border-white/75 bg-white/58 p-6 shadow-[0_30px_90px_rgba(75,45,130,.18)] backdrop-blur-2xl">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">
                Wi-Fi Setup
              </div>
              <h2 className="mt-1 text-2xl font-black">Настройка Wi-Fi</h2>

              <div className="mt-6 space-y-3">
                {[
                  "Подключитесь к сети ArunaEyes_Setup",
                  "Откройте в браузере http://192.168.4.1",
                  "Введите название Wi-Fi и пароль",
                  "После перезапуска очки подключатся к вашей сети",
                  "Затем используйте адрес http://arunaeyes.local",
                ].map((text, index) => (
                  <div
                    key={text}
                    className="flex gap-3 rounded-2xl bg-white/60 p-4 text-sm font-medium text-zinc-700 ring-1 ring-white/70"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-xs font-black text-white">
                      {index + 1}
                    </div>
                    <div className="leading-6">{text}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  onClick={openSetupPortal}
                  className="rounded-2xl bg-black px-5 py-3 text-sm font-black text-white shadow-xl transition hover:scale-[1.01]"
                >
                  Open setup portal
                </button>

                <button
                  onClick={handleStartSetup}
                  className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-xl transition hover:scale-[1.01]"
                >
                  Change Wi-Fi
                </button>
              </div>
            </section>

            <section className="rounded-[2.2rem] border border-white/75 bg-white/58 p-6 shadow-[0_30px_90px_rgba(75,45,130,.18)] backdrop-blur-2xl">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">
                Connection
              </div>
              <h2 className="mt-1 text-2xl font-black">Подключение к очкам</h2>

              <div className="mt-6 rounded-[1.7rem] border border-white/75 bg-white/60 p-5 shadow-sm backdrop-blur-xl">
                <div className="text-sm font-bold text-zinc-500">
                  Рекомендуемый адрес
                </div>
                <div className="mt-2 break-all text-xl font-black text-zinc-950">
                  http://arunaeyes.local
                </div>

                <button
                  onClick={useLocalAddress}
                  className="mt-4 rounded-2xl bg-black px-4 py-3 text-sm font-black text-white shadow-xl transition hover:scale-[1.01]"
                >
                  Использовать .local
                </button>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-black text-zinc-700">
                  Адрес очков
                </label>
                <input
                  value={esp32Url}
                  onChange={(e) => setEsp32Url(e.target.value)}
                  placeholder="http://arunaeyes.local или http://192.168.1.71"
                  className="w-full rounded-2xl border border-white/75 bg-white/70 px-4 py-3 text-zinc-950 shadow-sm outline-none backdrop-blur-xl placeholder:text-zinc-400 focus:ring-2 focus:ring-violet-300"
                />
                <div className="mt-2 text-sm font-medium text-zinc-500">
                  Если .local не работает, вставьте IP с локальной страницы очков.
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <button
                  onClick={connect}
                  className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-xl transition hover:scale-[1.01]"
                >
                  Подключиться
                </button>

                <button
                  onClick={disconnect}
                  className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white shadow-xl transition hover:scale-[1.01]"
                >
                  Отключиться
                </button>

                <button
                  onClick={reconnect}
                  className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-xl transition hover:scale-[1.01]"
                >
                  Переподключиться
                </button>
              </div>
            </section>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-[2rem] border border-white/75 bg-white/55 p-5 shadow-[0_24px_70px_rgba(75,45,130,.14)] backdrop-blur-2xl">
              <div className="text-sm font-bold text-zinc-500">Устройство</div>
              <div className="mt-3 text-xl font-black text-zinc-950">
                {isOnline ? `${deviceName} подключены` : "Очки не подключены"}
              </div>
              <div className="mt-2 text-sm font-medium text-zinc-500">
                Режим: {connected ? "подключение включено" : "подключение выключено"}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/75 bg-white/55 p-5 shadow-[0_24px_70px_rgba(75,45,130,.14)] backdrop-blur-2xl">
              <div className="text-sm font-bold text-zinc-500">Сеть</div>
              <div className="mt-3 break-words text-xl font-black text-zinc-950">
                {status?.wifiSsid || "—"}
              </div>
              <div className="mt-2 text-sm font-medium text-zinc-500">
                IP: {status?.ip || "—"}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/75 bg-white/55 p-5 shadow-[0_24px_70px_rgba(75,45,130,.14)] backdrop-blur-2xl">
              <div className="text-sm font-bold text-zinc-500">Состояние</div>
              <div className="mt-3 text-xl font-black text-zinc-950">
                {isOnline ? "Онлайн" : "Оффлайн"}
              </div>
              <div className="mt-2 text-sm font-medium text-zinc-500">
                {status?.apMode
                  ? "Очки в режиме настройки"
                  : "Очки в обычном режиме"}
              </div>
            </div>
          </div>

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