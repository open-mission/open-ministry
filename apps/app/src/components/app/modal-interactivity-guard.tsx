"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Camadas que, quando abertas, justificam o lock de scroll/pointer-events. */
export const MODAL_OPEN_SELECTORS = [
  '[data-state="open"][role="dialog"]',
  '[data-state="open"][role="alertdialog"]',
  '[data-slot="dialog-content"][data-state="open"]',
  '[data-slot="sheet-content"][data-state="open"]',
  '[data-slot="alert-dialog-content"][data-state="open"]',
  '[data-slot="drawer-content"][data-state="open"]',
  '[data-slot="dropdown-menu-content"][data-state="open"]',
  '[data-slot="select-content"][data-state="open"]',
  '[data-slot="popover-content"][data-state="open"]',
] as const;

/** Existe alguma camada modal aberta no documento? */
export function hasOpenModalLayers(doc: Document): boolean {
  return MODAL_OPEN_SELECTORS.some((selector) => doc.querySelector(selector) !== null);
}

export function hasBodyLock(doc: Document): boolean {
  const body = doc.body;
  if (!body) return false;

  return (
    body.style.pointerEvents === "none" ||
    body.hasAttribute("data-scroll-locked") ||
    Array.from(body.classList).some((name) => name.startsWith("block-interactivity-"))
  );
}

/**
 * Remove locks órfãos do `<body>` quando nenhuma camada modal está aberta.
 * Retorna `true` quando algo foi efetivamente limpo.
 */
export function cleanupOrphanedBodyLock(doc: Document): boolean {
  if (hasOpenModalLayers(doc)) return false;

  const body = doc.body;
  if (!body) return false;

  let cleaned = false;

  if (body.style.pointerEvents === "none") {
    body.style.pointerEvents = "";
    cleaned = true;
  }

  for (const className of Array.from(body.classList)) {
    if (className.startsWith("block-interactivity-")) {
      body.classList.remove(className);
      cleaned = true;
    }
  }

  if (body.hasAttribute("data-scroll-locked")) {
    body.removeAttribute("data-scroll-locked");
    cleaned = true;
  }

  return cleaned;
}

/**
 * Rede de segurança para locks de interatividade que sobram após
 * animações de saída de Dialogs/Sheets/Drawers (inclusive trocas de rota).
 */
export function ModalInteractivityGuard() {
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;
    if (!body) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const scheduleCleanup = () => {
      if (timer !== null) clearTimeout(timer);
      // 500ms de animação de saída do Vaul Drawer + margem de segurança.
      timer = setTimeout(() => {
        timer = null;
        cleanupOrphanedBodyLock(document);
      }, 550);
    };

    const observer = new MutationObserver(() => {
      if (hasBodyLock(document)) scheduleCleanup();
    });

    observer.observe(body, {
      attributes: true,
      attributeFilter: ["style", "class", "data-scroll-locked"],
      // A desmontagem de um Portal pode não alterar atributo algum no body.
      childList: true,
    });

    // Rede de segurança final: se o lock órfão sobreviver à animação, o
    // próximo toque o remove antes que a interação seja bloqueada.
    const handlePointerDown = () => {
      if (hasBodyLock(document)) cleanupOrphanedBodyLock(document);
    };
    document.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
    });

    if (hasBodyLock(document)) scheduleCleanup();

    return () => {
      observer.disconnect();
      document.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
      if (timer !== null) clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
