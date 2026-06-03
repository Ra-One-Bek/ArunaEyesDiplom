import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";

export default function HeroPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [eye, setEye] = useState({ x: 0, y: 0 });
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const actions = useMemo(
    () => [
      { title: "Navigate", icon: "➜", path: "/nav" },
      { title: "AI Assistant", icon: "✦", path: "/assistant" },
      { title: "Music", icon: "♪", path: "/music" },
      { title: "Status Glasses", icon: "●", path: "/status" },
      { title: "Connect", icon: "⌁", path: "/connect-glasses" },
    ],
    []
  );

  useEffect(() => {
    let frameId = 0;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };

    const handlePointerMove = (event: PointerEvent) => {
      const dx = event.clientX / window.innerWidth - 0.5;
      const dy = event.clientY / window.innerHeight - 0.5;

      target.x = Math.max(-18, Math.min(18, dx * 34));
      target.y = Math.max(-13, Math.min(13, dy * 26));
    };

    const animateEyes = () => {
      current.x += (target.x - current.x) * 0.11;
      current.y += (target.y - current.y) * 0.11;

      setEye({ x: current.x, y: current.y });
      frameId = requestAnimationFrame(animateEyes);
    };

    window.addEventListener("pointermove", handlePointerMove);
    frameId = requestAnimationFrame(animateEyes);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  const next = () => setActive((prev) => (prev + 1) % actions.length);

  const prev = () =>
    setActive((prev) => (prev - 1 + actions.length) % actions.length);

  const handleTouchEnd = (x: number) => {
    if (touchStart === null) return;

    const diff = touchStart - x;

    if (Math.abs(diff) > 45) {
      diff > 0 ? next() : prev();
    }

    setTouchStart(null);
  };

  return (
    <section className="relative h-dvh w-full overflow-hidden bg-[#efe9ff] text-zinc-950">
      <style>{`
        @keyframes floatSoft {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(18px, -24px, 0) rotate(8deg); }
        }

        @keyframes blinkOnce {
          0%, 90%, 100% { transform: scaleY(1); }
          94% { transform: scaleY(0.02); }
          97% { transform: scaleY(1); }
        }

        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: .55; }
          50% { transform: scale(1.14); opacity: .82; }
        }

        .hero-eye {
          animation: blinkOnce 5.8s infinite;
          transform-origin: center;
        }

        .float-one { animation: floatSoft 9s ease-in-out infinite; }
        .float-two { animation: floatSoft 12s ease-in-out infinite reverse; }
        .soft-glow { animation: breathe 6s ease-in-out infinite; }
      `}</style>

      <div className="absolute inset-0">
        <div className="soft-glow absolute -left-24 -top-24 h-80 w-80 rounded-full bg-violet-300/70 blur-3xl sm:h-[30rem] sm:w-[30rem]" />
        <div className="soft-glow absolute -right-28 top-20 h-80 w-80 rounded-full bg-fuchsia-200/70 blur-3xl sm:h-[30rem] sm:w-[30rem]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#ffffffb8,transparent_44%),linear-gradient(135deg,#f8f4ff,#ded3ff_52%,#f7f2ff)]" />

        <div className="float-one absolute left-[8%] top-[18%] h-16 w-16 rounded-[20px] bg-black shadow-[18px_18px_0_rgba(0,0,0,.14)] sm:h-24 sm:w-24" />
        <div className="float-two absolute right-[10%] top-[16%] h-12 w-12 rounded-2xl bg-white shadow-xl sm:h-16 sm:w-16" />
        <div className="float-two absolute bottom-[14%] left-[16%] h-10 w-10 rounded-xl bg-violet-300/70 sm:h-14 sm:w-14" />
        <div className="float-one absolute bottom-[18%] right-[18%] h-16 w-16 rounded-[22px] bg-black shadow-2xl sm:h-24 sm:w-24" />
      </div>

      <div className="relative z-10 h-full">
        <Header />

        <div className="pointer-events-none absolute left-1/2 top-[15%] z-20 -translate-x-1/2 sm:top-[13%]">
          <div className="rounded-[2.6rem] border border-white/75 bg-white/38 px-8 py-5 shadow-[0_26px_90px_rgba(91,62,164,.18)] backdrop-blur-2xl sm:px-10 sm:py-6">
            <div className="flex items-center gap-7 sm:gap-10">
              {[0, 1].map((item) => (
                <div
                  key={item}
                  className="hero-eye relative h-24 w-24 overflow-hidden rounded-full bg-white shadow-[inset_0_8px_20px_rgba(0,0,0,.14),0_16px_38px_rgba(62,42,120,.25)] sm:h-32 sm:w-32"
                >
                  <div
                    className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-black shadow-[inset_0_-5px_10px_rgba(255,255,255,.14)] sm:h-16 sm:w-16"
                    style={{
                      transform: `translate(calc(-50% + ${eye.x}px), calc(-50% + ${eye.y}px))`,
                    }}
                  >
                    <div className="absolute right-2.5 top-2.5 h-3.5 w-3.5 rounded-full bg-white sm:right-3 sm:top-3 sm:h-5 sm:w-5" />
                    <div className="absolute bottom-2.5 left-2.5 h-2 w-2 rounded-full bg-white/45 sm:h-2.5 sm:w-2.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <main className="absolute inset-0 z-30">
          <div
            className="absolute left-1/2 top-[56%] h-[430px] w-full max-w-[920px] -translate-x-1/2 -translate-y-1/2 select-none px-4 sm:h-[460px]"
            onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
            onTouchEnd={(e) => handleTouchEnd(e.changedTouches[0].clientX)}
          >
            {actions.map((item, index) => {
              const offset = index - active;
              const wrapped =
                offset > actions.length / 2
                  ? offset - actions.length
                  : offset < -actions.length / 2
                  ? offset + actions.length
                  : offset;

              return (
                <button
                  key={item.title}
                  onClick={() =>
                    index === active ? navigate(item.path) : setActive(index)
                  }
                  className="absolute left-1/2 top-1/2 flex h-[330px] w-[285px] flex-col justify-between rounded-[2.4rem] border border-white/75 bg-white/48 p-6 text-left shadow-[0_30px_90px_rgba(75,45,130,.24)] backdrop-blur-2xl transition-all duration-500 ease-out sm:h-[350px] sm:w-[330px]"
                  style={{
                    transform: `translate(-50%, -50%) translateX(${
                      wrapped * 64
                    }%) scale(${wrapped === 0 ? 1 : 0.84}) rotate(${
                      wrapped * -7
                    }deg)`,
                    opacity:
                      Math.abs(wrapped) > 1 ? 0 : wrapped === 0 ? 1 : 0.42,
                    zIndex: 20 - Math.abs(wrapped),
                    pointerEvents: Math.abs(wrapped) > 1 ? "none" : "auto",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-2xl text-white shadow-xl">
                      {item.icon}
                    </span>
                    <span className="rounded-full bg-violet-200/75 px-3 py-1 text-xs font-black uppercase tracking-wide text-violet-900">
                      EYES
                    </span>
                  </div>

                  <div>
                    <h1 className="text-4xl font-black leading-none tracking-tight sm:text-5xl">
                      {item.title}
                    </h1>
                    <div className="mt-6 flex items-center justify-between rounded-2xl bg-black px-5 py-4 text-white shadow-xl">
                      <span className="font-bold">Open</span>
                      <span className="text-xl">→</span>
                    </div>
                  </div>
                </button>
              );
            })}

            <button
              onClick={prev}
              className="absolute left-3 top-1/2 z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-2xl shadow-xl backdrop-blur-xl transition hover:scale-105 sm:-left-16 lg:-left-24"
            >
              ‹
            </button>

            <button
              onClick={next}
              className="absolute right-3 top-1/2 z-40 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-2xl shadow-xl backdrop-blur-xl transition hover:scale-105 sm:-right-16 lg:-right-24"
            >
              ›
            </button>
          </div>
        </main>

        <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center justify-center gap-2">
          {actions.map((item, index) => (
            <button
              key={item.title}
              onClick={() => setActive(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                active === index
                  ? "w-8 bg-black"
                  : "w-2.5 bg-black/25 hover:bg-black/45"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}