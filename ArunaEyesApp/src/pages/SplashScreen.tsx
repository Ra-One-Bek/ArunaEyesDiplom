export default function SplashScreen() {
  return (
    <section className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-[#efe9ff] text-zinc-950">
      <div className="absolute -left-28 -top-28 h-[30rem] w-[30rem] rounded-full bg-violet-300/60 blur-3xl" />
      <div className="absolute -right-24 top-20 h-[28rem] w-[28rem] rounded-full bg-fuchsia-200/70 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#ffffffc9,transparent_44%),linear-gradient(135deg,#f8f4ff,#ded3ff_52%,#f7f2ff)]" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="rounded-[2.5rem] border border-white/75 bg-white/45 px-8 py-5 shadow-[0_30px_90px_rgba(75,45,130,.22)] backdrop-blur-2xl">
          <div className="flex gap-5">
            {[0, 1].map((eye) => (
              <div
                key={eye}
                className="h-20 w-20 animate-pulse rounded-full bg-white shadow-[inset_0_8px_20px_rgba(0,0,0,.14),0_16px_38px_rgba(62,42,120,.25)]"
              >
                <div className="mx-auto mt-5 h-10 w-10 rounded-full bg-black">
                  <div className="ml-6 mt-2 h-3 w-3 rounded-full bg-white" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <h1 className="mt-8 text-4xl font-black tracking-tight">Aruna Eyes</h1>
        <p className="mt-2 text-sm font-bold uppercase tracking-[0.25em] text-violet-700">
          Loading interface
        </p>

        <div className="mt-8 h-2 w-52 overflow-hidden rounded-full bg-white/70">
          <div className="h-full w-1/2 animate-[loader_1.1s_ease-in-out_infinite] rounded-full bg-black" />
        </div>
      </div>

      <style>{`
        @keyframes loader {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(220%); }
        }
      `}</style>
    </section>
  );
}