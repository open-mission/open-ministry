import type { ReactNode } from "react";

export type TodayHomeLayoutProps = {
  /** Versículo compacto da primeira dobra mobile. */
  mobileVerse: ReactNode;
  nextAssignment: ReactNode;
  tasks: ReactNode;
  notifications: ReactNode;
  weekAttention: ReactNode;
  nextEvent: ReactNode;
  /** Versículo completo, exibido apenas na coluna secundária do desktop. */
  desktopVerse: ReactNode;
  birthdays: ReactNode;
};

/**
 * Organiza a aba Hoje com um único grid e wrappers `contents`: no mobile cada
 * bloco é um item do grid (ordenado por `order-*`); no desktop os wrappers
 * viram colunas flex de 7 e 5 colunas e os blocos voltam à ordem natural.
 *
 * Assim cada card é montado uma única vez, exceto o versículo, que tem uma
 * variante compacta no mobile e a completa no desktop.
 */
export function TodayHomeLayout({
  mobileVerse,
  nextAssignment,
  tasks,
  notifications,
  weekAttention,
  nextEvent,
  desktopVerse,
  birthdays,
}: TodayHomeLayoutProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
      <div className="order-1 lg:hidden">{mobileVerse}</div>

      <div className="contents lg:col-span-7 lg:flex lg:flex-col lg:gap-6">
        {nextAssignment ? (
          <div className="order-2 lg:order-none">{nextAssignment}</div>
        ) : null}

        {weekAttention ? (
          <div className="order-5 lg:order-none">{weekAttention}</div>
        ) : null}

        {notifications ? (
          <div className="order-4 lg:order-none">{notifications}</div>
        ) : null}

        {nextEvent ? (
          <div className="order-6 lg:order-none">{nextEvent}</div>
        ) : null}
      </div>

      <div className="contents lg:col-span-5 lg:flex lg:flex-col lg:gap-6">
        {tasks ? <div className="order-3 lg:order-none">{tasks}</div> : null}

        {desktopVerse ? (
          <div className="hidden lg:order-none lg:block">{desktopVerse}</div>
        ) : null}

        {birthdays ? (
          <div className="order-7 lg:order-none">{birthdays}</div>
        ) : null}
      </div>
    </div>
  );
}
