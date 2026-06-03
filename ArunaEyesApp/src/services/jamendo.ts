export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  url: string;
  cover?: string;
  source: "jamendo" | "local";
  fileName?: string;
};

const CLIENT_ID = import.meta.env.VITE_JAMENDO_CLIENT_ID;

export async function loadTracks(
  query = "ambient",
  limit = 30
): Promise<MusicTrack[]> {
  if (!CLIENT_ID) {
    throw new Error("VITE_JAMENDO_CLIENT_ID не найден в .env");
  }

  const url =
    "https://api.jamendo.com/v3.0/tracks/?" +
    `client_id=${CLIENT_ID}` +
    "&format=json" +
    `&limit=${limit}` +
    "&audioformat=mp32" +
    `&search=${encodeURIComponent(query)}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Ошибка загрузки музыки из Jamendo");
  }

  const json = await res.json();

  return (json.results ?? []).map((track: any) => ({
    id: String(track.id),
    title: track.name || "Unknown track",
    artist: track.artist_name || "Unknown artist",
    url: track.audio,
    cover: track.album_image,
    source: "jamendo",
  }));
}