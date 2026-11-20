"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Só passa a retornar `true` depois da hidratação no cliente.
 * Evita trocar Dialog por Drawer enquanto o HTML do servidor ainda está sendo
 * hidratado (o hook `useIsMobile` começa com `false` no servidor).
 */
export function useMounted() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
