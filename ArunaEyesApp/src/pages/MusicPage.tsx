import { useEffect, useRef, useState } from "react";
import Header from "./Header";
import { loadTracks, type MusicTrack } from "../services/jamendo";
import { useLocation } from "react-router-dom";

export default function MusicPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [search, setSearch] = useState("ambient");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const location = useLocation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  const currentTrack = tracks[currentIndex] ?? null;
  const shouldAutoplay = new URLSearchParams(location.search).get("autoplay") === "1";

  async function searchMusic(value = search, autoplay = false) {
    setLoading(true);

    try {
        const data = await loadTracks(value);

        setTracks(data);
        setCurrentIndex(0);
        setProgress(0);
        setPlaying(false);

        if (autoplay) {
        window.setTimeout(() => {
            void audioRef.current
            ?.play()
            .then(() => setPlaying(true))
            .catch(() => {
                setPlaying(false);
            });
        }, 500);
        }
    } finally {
        setLoading(false);
    }
    }

  useEffect(() => {
    void searchMusic("ambient", shouldAutoplay);
  }, []);

  useEffect(() => {
    if (!shouldAutoplay || !currentTrack || !audioRef.current) return;

    const timer = window.setTimeout(() => {
        void audioRef.current
        ?.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }, 400);

    return () => window.clearTimeout(timer);
    }, [shouldAutoplay, currentTrack]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    return () => {
      tracks.forEach((track) => {
        if (track.source === "local") {
          URL.revokeObjectURL(track.url);
        }
      });
    };
  }, [tracks]);

  function handleUpload(files: FileList | null) {
    if (!files) return;

    const audioFiles = Array.from(files).filter((file) =>
      file.type.startsWith("audio/")
    );

    const localTracks: MusicTrack[] = audioFiles.map((file) => ({
      id: `${file.name}-${file.lastModified}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Local music",
      url: URL.createObjectURL(file),
      source: "local",
      fileName: file.name,
    }));

    setTracks((prev) => [...localTracks, ...prev]);

    if (localTracks.length > 0) {
      setCurrentIndex(0);
      setPlaying(false);
      setProgress(0);
    }
  }

  async function togglePlay() {
    if (!audioRef.current || !currentTrack) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    try {
      await audioRef.current.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  function nextTrack() {
    if (!tracks.length) return;

    setCurrentIndex((prev) => (prev + 1) % tracks.length);
    setPlaying(false);
    setProgress(0);

    window.setTimeout(() => {
      void audioRef.current?.play().then(() => setPlaying(true)).catch(() => {});
    }, 100);
  }

  function prevTrack() {
    if (!tracks.length) return;

    setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setPlaying(false);
    setProgress(0);
  }

  function formatTime(seconds: number) {
    if (!Number.isFinite(seconds)) return "0:00";

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function handleSeek(value: number) {
    if (!audioRef.current) return;

    audioRef.current.currentTime = value;
    setProgress(value);
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
          <div className="mb-6 rounded-[2rem] border border-white/75 bg-white/55 p-6 shadow-[0_30px_90px_rgba(75,45,130,.18)] backdrop-blur-2xl">
            <div className="inline-flex rounded-full bg-violet-200/80 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-900">
              Music Player
            </div>

            <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
              Музыка
            </h1>

            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-zinc-600">
              Загружайте музыку через Jamendo API или добавляйте локальные аудиофайлы.
            </p>
          </div>

          <div className="mb-5 flex flex-col gap-3 rounded-[2rem] border border-white/75 bg-white/55 p-4 shadow-[0_24px_70px_rgba(75,45,130,.14)] backdrop-blur-2xl sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void searchMusic();
              }}
              placeholder="Поиск музыки: ambient, relax, piano..."
              className="min-w-0 flex-1 rounded-2xl border border-white/75 bg-white/75 px-5 py-4 text-zinc-950 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-violet-300"
            />

            <button
              onClick={() => void searchMusic()}
              disabled={loading}
              className="rounded-2xl bg-black px-6 py-4 text-sm font-black text-white shadow-xl transition hover:scale-[1.01] disabled:opacity-50"
            >
              {loading ? "Loading..." : "Search"}
            </button>
          </div>

          {apiError ? (
            <div className="mb-5 rounded-[2rem] border border-red-200 bg-red-100/80 p-5 text-sm font-bold text-red-700 shadow-xl backdrop-blur-2xl">
              {apiError}
            </div>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[2.2rem] border border-white/75 bg-white/58 p-6 shadow-[0_30px_90px_rgba(75,45,130,.18)] backdrop-blur-2xl">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">
                Upload
              </div>

              <h2 className="mt-1 text-2xl font-black">Загрузить музыку</h2>

              <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-violet-300 bg-white/55 px-6 py-10 text-center shadow-sm transition hover:scale-[1.01] hover:bg-white/70">
                <div className="text-5xl">🎧</div>

                <div className="mt-4 text-lg font-black text-zinc-950">
                  Выберите аудиофайлы
                </div>

                <div className="mt-2 text-sm font-medium text-zinc-500">
                  MP3, WAV, OGG
                </div>

                <input
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={(e) => handleUpload(e.target.files)}
                  className="hidden"
                />
              </label>

              <div className="mt-5 rounded-2xl bg-white/60 p-4 text-sm font-medium leading-6 text-zinc-600 ring-1 ring-white/70">
                Локальные файлы не отправляются на сервер. Jamendo-треки
                загружаются через публичный API.
              </div>
            </section>

            <section className="rounded-[2.2rem] border border-white/75 bg-white/58 p-6 shadow-[0_30px_90px_rgba(75,45,130,.18)] backdrop-blur-2xl">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">
                Now Playing
              </div>

              <div className="mt-5 flex min-h-[360px] flex-col justify-between rounded-[2rem] bg-white/60 p-6 ring-1 ring-white/70">
                <div className="text-center">
                  <div className="mx-auto flex h-44 w-44 items-center justify-center overflow-hidden rounded-[2rem] bg-black text-5xl text-white shadow-[0_24px_70px_rgba(0,0,0,.22)]">
                    {currentTrack?.cover ? (
                      <img
                        src={currentTrack.cover}
                        alt={currentTrack.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      "♪"
                    )}
                  </div>

                  <h2 className="mt-6 line-clamp-2 text-3xl font-black text-zinc-950">
                    {currentTrack ? currentTrack.title : "Музыка не выбрана"}
                  </h2>

                  <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-violet-700">
                    {currentTrack ? currentTrack.artist : "Upload or search"}
                  </p>
                </div>

                <div className="mt-8">
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    value={progress}
                    onChange={(e) => handleSeek(Number(e.target.value))}
                    disabled={!currentTrack}
                    className="w-full accent-black"
                  />

                  <div className="mt-2 flex justify-between text-xs font-bold text-zinc-500">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-4">
                    <button
                      onClick={prevTrack}
                      disabled={!tracks.length}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-xl font-black shadow-md transition hover:scale-105 disabled:opacity-40"
                    >
                      ‹
                    </button>

                    <button
                      onClick={togglePlay}
                      disabled={!currentTrack}
                      className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-2xl font-black text-white shadow-xl transition hover:scale-105 disabled:opacity-40"
                    >
                      {playing ? "Ⅱ" : "▶"}
                    </button>

                    <button
                      onClick={nextTrack}
                      disabled={!tracks.length}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-xl font-black shadow-md transition hover:scale-105 disabled:opacity-40"
                    >
                      ›
                    </button>
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <span className="text-sm font-black text-zinc-500">VOL</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-full accent-black"
                    />
                  </div>
                </div>
              </div>

              <audio
                ref={audioRef}
                src={currentTrack?.url}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={nextTrack}
              />
            </section>
          </div>

          <section className="mt-5 rounded-[2.2rem] border border-white/75 bg-white/58 p-6 shadow-[0_30px_90px_rgba(75,45,130,.18)] backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">
                  Playlist
                </div>
                <h2 className="mt-1 text-2xl font-black">Плейлист</h2>
              </div>

              <div className="rounded-full bg-violet-200/80 px-4 py-2 text-xs font-black text-violet-900">
                {tracks.length} tracks
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {loading ? (
                <div className="rounded-2xl bg-white/60 p-5 text-sm font-bold text-zinc-500 ring-1 ring-white/70">
                  Загружаю музыку...
                </div>
              ) : tracks.length === 0 ? (
                <div className="rounded-2xl bg-white/60 p-5 text-sm font-medium text-zinc-500 ring-1 ring-white/70">
                  Пока нет треков.
                </div>
              ) : (
                tracks.map((track, index) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      setCurrentIndex(index);
                      setPlaying(false);
                      setProgress(0);
                    }}
                    className={`flex items-center justify-between gap-4 rounded-2xl p-4 text-left ring-1 transition ${
                      currentIndex === index
                        ? "bg-black text-white ring-black"
                        : "bg-white/60 text-zinc-950 ring-white/70 hover:bg-white/80"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/70 text-lg font-black">
                        {track.cover ? (
                          <img
                            src={track.cover}
                            alt={track.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          "♪"
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-sm font-black">
                          {track.title}
                        </div>
                        <div
                          className={`mt-1 truncate text-xs font-bold ${
                            currentIndex === index
                              ? "text-white/60"
                              : "text-zinc-500"
                          }`}
                        >
                          {track.artist} · {track.source === "local" ? "Local" : "Jamendo"}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-lg font-black">
                      {currentIndex === index && playing ? "Ⅱ" : "▶"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        </main>
      </section>
    </>
  );
}