"use client";

import { useState } from "react";

import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Congela o modo (mobile x desktop) enquanto `active` estiver true.
 *
 * O `useIsMobile` usa `useSyncExternalStore` e pode fazer o flip `false ->
 * true` logo após a hidratação. Se isso acontecer com um modal aberto, o
 * Radix/Vaul desmonta um lado e monta o outro no mesmo tick, deixando o lock
 * de scroll/pointer-events órfão no `<body>`.
 */
export function useStableIsMobile(active: boolean): boolean {
  const isMobile = useIsMobile();
  const [lockedIsMobile, setLockedIsMobile] = useState(isMobile);
  const [wasActive, setWasActive] = useState(active);

  // Mesmo padrão de sincronização de props do React: atualiza o estado
  // durante a renderização, antes de qualquer efeito ou pintura.
  if (wasActive !== active) {
    setWasActive(active);
    if (active) setLockedIsMobile(isMobile);
  }

  return active ? lockedIsMobile : isMobile;
}
