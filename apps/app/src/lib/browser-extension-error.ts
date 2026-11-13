export const BROWSER_EXTENSION_URL_PATTERNS: RegExp[] = [
  /^webkit-masked-url:\/\//i,
  /^safari-web-extension:\/\//i,
  /^safari-extension:\/\//i,
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
];

const EXTENSION_URL_IN_TEXT_RE =
  /(?:webkit-masked-url|safari-web-extension|safari-extension|chrome-extension|moz-extension):\/\//i;

const APP_CODE_FRAME_RE =
  /https?:\/\/|\/_next\/|webpack-internal:\/\/|turbopack:\/\//i;

const guardedTargets = new WeakSet<object>();

function readStringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

/**
 * Returns true only when an error originates strictly from an injected browser
 * extension script (such as Safari's masked `webkit-masked-url://hidden/`) and
 * does not include any application or framework stack frames.
 */
export function isBrowserExtensionError(
  error: unknown,
  filename?: string | null,
): boolean {
  const record =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : null;

  const stack = record ? readStringField(record, "stack") : "";
  const sourceUrl = record ? readStringField(record, "sourceURL") : "";
  const file = typeof filename === "string" ? filename : "";

  if (APP_CODE_FRAME_RE.test(stack)) {
    return false;
  }

  return (
    EXTENSION_URL_IN_TEXT_RE.test(stack) ||
    EXTENSION_URL_IN_TEXT_RE.test(sourceUrl) ||
    EXTENSION_URL_IN_TEXT_RE.test(file)
  );
}

type SentryExceptionFrame = {
  filename?: string;
};

type SentryLikeEvent = {
  message?: string;
  exception?: {
    values?: Array<{
      stacktrace?: {
        frames?: SentryExceptionFrame[];
      };
    }>;
  };
};

/**
 * Checks whether a Sentry event originates exclusively from a browser extension.
 */
export function isSentryBrowserExtensionEvent(
  event: SentryLikeEvent,
  originalException?: unknown,
): boolean {
  if (isBrowserExtensionError(originalException)) {
    return true;
  }

  if (
    typeof event.message === "string" &&
    EXTENSION_URL_IN_TEXT_RE.test(event.message) &&
    !APP_CODE_FRAME_RE.test(event.message)
  ) {
    return true;
  }

  const frames =
    event.exception?.values?.flatMap(
      (value) => value.stacktrace?.frames ?? [],
    ) ?? [];

  let hasExtensionFrame = false;

  for (const frame of frames) {
    const filename = frame.filename;
    if (!filename) {
      continue;
    }
    if (APP_CODE_FRAME_RE.test(filename)) {
      return false;
    }
    if (EXTENSION_URL_IN_TEXT_RE.test(filename)) {
      hasExtensionFrame = true;
    }
  }

  return hasExtensionFrame;
}

type EventTargetLike = {
  addEventListener: (
    type: string,
    listener: (event: Event) => void,
    options?: boolean | AddEventListenerOptions,
  ) => void;
};

/**
 * Registers capture-phase listeners ahead of dev overlays and error trackers so
 * uncaught errors injected solely by browser extensions do not hijack the UI.
 */
export function installBrowserExtensionErrorGuard(
  target: EventTargetLike | undefined = typeof window !== "undefined"
    ? window
    : undefined,
): void {
  if (!target || guardedTargets.has(target)) {
    return;
  }
  guardedTargets.add(target);

  target.addEventListener(
    "error",
    (event) => {
      const errorEvent = event as ErrorEvent;
      if (isBrowserExtensionError(errorEvent.error, errorEvent.filename)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    { capture: true },
  );

  target.addEventListener(
    "unhandledrejection",
    (event) => {
      const rejectionEvent = event as PromiseRejectionEvent;
      if (isBrowserExtensionError(rejectionEvent.reason)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    { capture: true },
  );
}
