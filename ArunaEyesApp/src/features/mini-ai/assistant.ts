import type { RouteResult } from "../navigation/types";

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/ё/g, "е");
}

export function simplifyInstruction(instruction: string) {
  const t = normalize(instruction);

  if (t.includes("прибы")) return "Вы пришли в точку назначения.";
  if (t.includes("налево") || t.includes("левее")) return "Скоро поверните налево.";
  if (t.includes("направо") || t.includes("правее")) return "Скоро поверните направо.";
  if (t.includes("прямо") || t.includes("продолж")) return "Продолжайте двигаться прямо.";
  if (t.includes("развязк")) return "На развязке держитесь нужной стороны и не спешите.";
  if (t.includes("выйдите") || t.includes("старт")) return "Начните движение от текущей точки.";

  return instruction;
}

export function summarizeRoute(route: RouteResult | null) {
  if (!route) return "Маршрут еще не построен.";

  const firstStep = route.steps[0] ? simplifyInstruction(route.steps[0].instruction) : "";
  return `Маршрут от ${route.from} до ${route.to}. Примерно ${route.totalDistance} и ${route.totalDuration}. ${firstStep}`.trim();
}

export function summarizeRecognizedText(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Пока нет текста для пересказа.";
  if (cleaned.length <= 120) return cleaned;

  const shortened = cleaned.slice(0, 117).trimEnd();
  return `${shortened}...`;
}

export function answerAppQuestion(text: string) {
  const t = normalize(text);

  if (t.includes("что уме") || t.includes("что может") || t.includes("функц")) {
    return "Я помогаю с навигацией, командой 'где я', повтором подсказок и кратким объяснением маршрута.";
  }

  if (t.includes("как") && t.includes("маршрут")) {
    return "Скажите: маршрут точка А до точка Б. Например: маршрут Сарайшык 5Е до Мега Силквей.";
  }

  if ((t.includes("как") && t.includes("где я")) || t.includes("местополож")) {
    return "Для функции 'Где я' нажмите кнопку один раз или скажите 'где я'. Приложение определит ваше местоположение и покажет карту.";
  }

  if (t.includes("повтор")) {
    return "Чтобы повторить последнюю подсказку, нажмите кнопку три раза или скажите 'повтори'.";
  }

  if (t.includes("текст") && (t.includes("прочит") || t.includes("перескаж") || t.includes("резюм"))) {
    return "Мини-ИИ может кратко пересказывать распознанный текст, когда вы добавите сценарий чтения текста в приложение.";
  }

  return null;
}

export function rejectOffTopic() {
  return "Я отвечаю только по функциям приложения: навигация, местоположение, повтор подсказки и помощь по использованию.";
}
