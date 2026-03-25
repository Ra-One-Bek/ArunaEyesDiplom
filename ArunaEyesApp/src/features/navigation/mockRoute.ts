import type { RouteResult, RouteStep } from "./types";

export function buildMockRoute(from: string, to: string): RouteResult {
  const steps: RouteStep[] = [
    {
      id: "1",
      instruction: `Выйдите из точки “${from}” и двигайтесь к ближайшей главной дороге`,
      distance: "0.4 км",
      duration: "5 мин",
    },
    { id: "2", instruction: "Поверните направо и продолжайте прямо", distance: "1.8 км", duration: "12 мин" },
    { id: "3", instruction: "На развязке держитесь левее", distance: "0.9 км", duration: "7 мин" },
    { id: "4", instruction: `Прибыли в пункт назначения “${to}”`, distance: "0.0 км", duration: "0 мин" },
  ];

  return { from, to, totalDistance: "3.1 км", totalDuration: "24 мин", steps };
}