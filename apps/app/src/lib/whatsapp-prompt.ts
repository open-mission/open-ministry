/**
 * Helpers for WhatsApp phone formatting, validation, and prompt dismissal tracking.
 */

const DISMISS_KEY = "openministry_whatsapp_prompt_dismissed_until";

/**
 * Checks if the user has dismissed the WhatsApp prompt and the cooldown period is still active.
 */
export function isWhatsAppPromptDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const item = window.localStorage.getItem(DISMISS_KEY);
    if (!item) return false;
    const expiresAt = Number.parseInt(item, 10);
    if (Number.isNaN(expiresAt)) return false;
    return Date.now() < expiresAt;
  } catch {
    return false;
  }
}

/**
 * Snoozes the WhatsApp prompt for a periodic interval (default: 3 days).
 */
export function dismissWhatsAppPrompt(days = 3): void {
  if (typeof window === "undefined") return;
  try {
    const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(DISMISS_KEY, expiresAt.toString());
  } catch {
    // Ignore localStorage errors (e.g. private browsing or quota limits)
  }
}

/**
 * Clears the dismissal cooldown (e.g. after successfully saving phone).
 */
export function clearWhatsAppPromptDismissal(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DISMISS_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

// Valid DDDs in Brazil
const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/**
 * Masks and formats raw digits as Brazilian phone number:
 * - 11 digits: (XX) XXXXX-XXXX (cell phones)
 * - 10 digits: (XX) XXXX-XXXX (landlines)
 */
export function formatBrazilianPhone(value: string): string {
  let digits = value.replace(/\D/g, "");

  // Strip international country code +55 if user pasted full number
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }

  // Strip leading 0
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Cap at 11 digits
  digits = digits.slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;

  const isMobile = digits.length > 2 && digits.charAt(2) === "9";

  if (isMobile) {
    if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  // Landline formatting
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
}

/**
 * Validates whether the given phone string has 10 or 11 valid digits and a valid Brazilian DDD.
 */
export function isValidBrazilianPhone(value: string): boolean {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length !== 10 && digits.length !== 11) {
    return false;
  }

  const ddd = Number.parseInt(digits.slice(0, 2), 10);
  if (!VALID_DDDS.has(ddd)) {
    return false;
  }

  // Cell phones (11 digits) in Brazil must start with 9
  if (digits.length === 11 && digits.charAt(2) !== "9") {
    return false;
  }

  return true;
}
