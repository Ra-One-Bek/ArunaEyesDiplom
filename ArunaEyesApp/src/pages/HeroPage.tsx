import { useNavigate } from "react-router-dom";
import Header from "./Header";

export default function HeroPage() {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Navigate",
      subtitle: "Голосовая навигация и построение маршрута",
      onClick: () => navigate("/nav"),
    },
    {
      title: "AI Assistant",
      subtitle: "Интеллектуальная помощь и голосовые сценарии",
      onClick: () => navigate("/assistant"),
    },
    {
      title: "Status Glasses",
      subtitle: "Мониторинг очков, препятствий и команд",
      onClick: () => navigate("/status"),
    },
    {
      title: "Connect to Glasses",
      subtitle: "Подключение ESP32 и настройка Wi-Fi",
      onClick: () => navigate("/connect-glasses"),
    },
  ];

  return (
    <section className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <Header />

      <div className="absolute inset-0 -z-20">
        <div className="absolute top-[-120px] left-[-80px] h-[320px] w-[320px] rounded-full bg-violet-500/30 blur-3xl" />
        <div className="absolute right-[-80px] top-[120px] h-[340px] w-[340px] rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute bottom-[-100px] left-[25%] h-[300px] w-[300px] rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%)]" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 pb-10 pt-28 lg:px-10">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 backdrop-blur">
            ArunaEyes Smart Glasses Platform
          </div>

          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            Умные очки для навигации и голосовой помощи
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Веб-приложение для управления очками ArunaEyes: подключение к
            устройству, мониторинг препятствий, голосовые команды и навигация в
            реальном времени.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {actions.map((item) => (
            <button
              key={item.title}
              onClick={item.onClick}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-2xl shadow-black/20 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-300/30 hover:bg-white/10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-400/10 via-transparent to-sky-400/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="relative z-10 flex h-full min-h-[190px] flex-col justify-between">
                <div>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg font-bold text-violet-200">
                    {item.title.charAt(0)}
                  </div>

                  <h2 className="text-xl font-bold text-white">
                    {item.title}
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {item.subtitle}
                  </p>
                </div>

                <div className="mt-6 inline-flex items-center text-sm font-semibold text-violet-200 transition-all duration-300 group-hover:translate-x-1">
                  Open module
                  <span className="ml-2">→</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}