const LAST_SPOKEN_TEXT_KEY = "eyesapp:lastSpokenText";

export function speakRu(text: string) {
  if (!text) return;

  const synth = window.speechSynthesis;

  // 🔥 убираем старые фразы
  synth.cancel();

  const utter = new SpeechSynthesisUtterance(text);

  utter.lang = "ru-RU";
  utter.rate = 1;
  utter.pitch = 1;

  // 🔥 пауза перед началом
  setTimeout(() => {
    synth.speak(utter);
  }, 100);
}
export function stopSpeak() {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}

export function getLastSpokenText() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(LAST_SPOKEN_TEXT_KEY) ?? "";
}
