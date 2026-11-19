export type ChordsViewerControlVisibility = {
  copy: boolean;
  help: boolean;
  fullscreen: boolean;
};

type ChordsViewerControlOptions = {
  isFullscreen: boolean;
  hideFullscreenButton?: boolean;
};

/**
 * Define quais controles secundários aparecem na barra do visualizador.
 *
 * No modo palco (tela cheia) a barra fica restrita ao essencial — tom, zoom e
 * layout — para liberar espaço vertical. Fora dele, todos os controles voltam,
 * exceto o botão de tela cheia quando o visualizador já está dentro de um
 * Sheet/Drawer e não deve abrir um portal sobreposto.
 */
export function getChordsViewerControlVisibility({
  isFullscreen,
  hideFullscreenButton = false,
}: ChordsViewerControlOptions): ChordsViewerControlVisibility {
  if (isFullscreen) {
    return { copy: false, help: false, fullscreen: false };
  }

  return { copy: true, help: true, fullscreen: !hideFullscreenButton };
}

/**
 * Editar uma nota abre o formulário, que fica atrás do portal do modo palco.
 * No palco a cifra é somente leitura; os controles voltam ao sair da tela cheia.
 */
export function isSectionNoteEditEnabled(
  canEditNotes: boolean,
  isFullscreen: boolean,
): boolean {
  return canEditNotes && !isFullscreen;
}
