import { describe, expect, it } from "bun:test";

import {
  installBrowserExtensionErrorGuard,
  isBrowserExtensionError,
  isSentryBrowserExtensionEvent,
} from "../browser-extension-error";

describe("Browser extension error guard", () => {
  it("detects Safari WebKit masked extension stack traces (Bitwarden autofill)", () => {
    const error = new TypeError(
      "undefined is not an object (evaluating '(yield this.sendExtensionMessage(\"getUrlAutofillTargetingRules\")).result')",
    );
    error.stack =
      "@webkit-masked-url://hidden/:26677:92\nfulfilled@webkit-masked-url://hidden/:26218:62\npromiseReactionJob@[native code]";

    expect(isBrowserExtensionError(error)).toBe(true);
  });

  it("detects Safari sourceURL and ErrorEvent filename from extensions", () => {
    const safariError = {
      message: "Extension error",
      sourceURL: "webkit-masked-url://hidden/",
    };

    expect(isBrowserExtensionError(safariError)).toBe(true);
    expect(
      isBrowserExtensionError(
        new Error("Extension script failed"),
        "chrome-extension://abcdef/content.js",
      ),
    ).toBe(true);
  });

  it("never suppresses errors whose stack contains application or Next.js frames", () => {
    const mixedError = new TypeError("App callback failed");
    mixedError.stack =
      "onFocus@http://localhost:3000/_next/static/chunks/app.js:10:5\n@webkit-masked-url://hidden/:12:3";

    const prodError = new Error("Production failure");
    prodError.stack =
      "Error: Production failure\n    at submit (https://app.openministry.online/_next/static/chunks/page.js:1:42)";

    expect(isBrowserExtensionError(mixedError, "webkit-masked-url://hidden/")).toBe(
      false,
    );
    expect(isBrowserExtensionError(prodError)).toBe(false);
    expect(isBrowserExtensionError(new Error("No extension URL"))).toBe(false);
  });

  it("filters Sentry events originating solely from browser extension frames", () => {
    expect(
      isSentryBrowserExtensionEvent({
        exception: {
          values: [
            {
              stacktrace: {
                frames: [{ filename: "webkit-masked-url://hidden/" }],
              },
            },
          ],
        },
      }),
    ).toBe(true);

    expect(
      isSentryBrowserExtensionEvent({
        exception: {
          values: [
            {
              stacktrace: {
                frames: [
                  { filename: "webkit-masked-url://hidden/" },
                  { filename: "https://app.openministry.online/_next/static/chunks/main.js" },
                ],
              },
            },
          ],
        },
      }),
    ).toBe(false);
  });

  it("blocks extension unhandledrejection/error listeners downstream while allowing app errors", () => {
    const target = new EventTarget();
    installBrowserExtensionErrorGuard(target);
    // Calling twice stays idempotent
    installBrowserExtensionErrorGuard(target);

    let downstreamCalls = 0;
    target.addEventListener("unhandledrejection", () => {
      downstreamCalls += 1;
    });
    target.addEventListener("error", () => {
      downstreamCalls += 1;
    });

    const extensionReason = new TypeError("Extension rejection");
    extensionReason.stack = "@webkit-masked-url://hidden/:26677:92";

    const extensionRejection = new Event("unhandledrejection", {
      cancelable: true,
    }) as Event & { reason?: unknown };
    extensionRejection.reason = extensionReason;

    target.dispatchEvent(extensionRejection);
    expect(extensionRejection.defaultPrevented).toBe(true);
    expect(downstreamCalls).toBe(0);

    const appError = new Error("Real bug");
    appError.stack = "at Page (http://localhost:3000/_next/static/chunks/app.js:1:1)";
    const appRejection = new Event("unhandledrejection", {
      cancelable: true,
    }) as Event & { reason?: unknown };
    appRejection.reason = appError;

    target.dispatchEvent(appRejection);
    expect(appRejection.defaultPrevented).toBe(false);
    expect(downstreamCalls).toBe(1);

    const extensionErrorEvent = new Event("error", {
      cancelable: true,
    }) as Event & { error?: unknown; filename?: string };
    extensionErrorEvent.filename = "webkit-masked-url://hidden/";
    extensionErrorEvent.error = extensionReason;

    target.dispatchEvent(extensionErrorEvent);
    expect(extensionErrorEvent.defaultPrevented).toBe(true);
    expect(downstreamCalls).toBe(1);

    const appErrorEvent = new Event("error", {
      cancelable: true,
    }) as Event & { error?: unknown; filename?: string };
    appErrorEvent.filename = "http://localhost:3000/_next/static/chunks/app.js";
    appErrorEvent.error = appError;

    target.dispatchEvent(appErrorEvent);
    expect(appErrorEvent.defaultPrevented).toBe(false);
    expect(downstreamCalls).toBe(2);
  });
});
