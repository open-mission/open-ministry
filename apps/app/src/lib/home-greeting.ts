const HOME_TIME_ZONE = "America/Sao_Paulo";

/** Saudação pelo horário de Brasília, estável entre servidor e cliente. */
export function getHomeGreeting(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: HOME_TIME_ZONE,
    }).format(now),
  );

  if (hour < 12) {
    return "Bom dia";
  }

  if (hour < 18) {
    return "Boa tarde";
  }

  return "Boa noite";
}

/** Data por extenso em pt-BR, com a primeira letra maiúscula. */
export function formatHomeDateLabel(now: Date = new Date()): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: HOME_TIME_ZONE,
  }).format(now);

  return label.charAt(0).toUpperCase() + label.slice(1);
}
