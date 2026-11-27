"use client";

import { useEffect, type RefObject } from "react";

export const AUTO_SCROLL_SPEEDS = [1, 1.5, 2] as const;
export type AutoScrollSpeed = (typeof AUTO_SCROLL_SPEEDS)[number];

/** Velocidade base em pixels por segundo (multiplicada pelo fator escolhido). */
const BASE_PIXELS_PER_SECOND = 18;

type UseAutoScrollOptions = {
  active: boolean;
  speed: AutoScrollSpeed;
  /**
   * Container rolável do modo palco. Sem ele, a rolagem acontece na janela —
   * caso da leitura normal, em que a cifra/letra rola junto com a página.
   */
  containerRef?: RefObject<HTMLElement | null>;
};

/**
 * Rolagem automática suave baseada em requestAnimationFrame. O frame é
 * cancelado ao desmontar, ao pausar ou ao trocar de velocidade.
 */
export function useAutoScroll({
  active,
  speed,
  containerRef,
}: UseAutoScrollOptions) {
  useEffect(() => {
    if (!active) return;
    if (typeof window === "undefined") return;

    let frame = 0;
    let last = 0;
    let carry = 0;

    const step = (now: number) => {
      if (!last) last = now;
      // Evita saltos grandes depois de a aba voltar do segundo plano.
      const elapsed = Math.min(now - last, 120);
      last = now;

      carry += (elapsed / 1000) * BASE_PIXELS_PER_SECOND * speed;
      const pixels = Math.floor(carry);

      if (pixels > 0) {
        carry -= pixels;
        const container = containerRef?.current;
        if (container) {
          container.scrollTop += pixels;
        } else {
          window.scrollBy(0, pixels);
        }
      }

      frame = window.requestAnimationFrame(step);
    };

    frame = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [active, speed, containerRef]);
}
