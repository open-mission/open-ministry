import { describe, expect, test } from "bun:test";
import {
  formatBrazilianPhone,
  isValidBrazilianPhone,
} from "@/lib/whatsapp-prompt";

describe("WhatsApp Phone Formatting and Validation", () => {
  test("formats empty or partial digits smoothly", () => {
    expect(formatBrazilianPhone("")).toBe("");
    expect(formatBrazilianPhone("1")).toBe("(1");
    expect(formatBrazilianPhone("11")).toBe("(11");
    expect(formatBrazilianPhone("119")).toBe("(11) 9");
    expect(formatBrazilianPhone("1198888")).toBe("(11) 98888");
  });

  test("formats 10 digits as landline", () => {
    expect(formatBrazilianPhone("1133334444")).toBe("(11) 3333-4444");
  });

  test("formats 11 digits as cell phone", () => {
    expect(formatBrazilianPhone("11988887777")).toBe("(11) 98888-7777");
  });

  test("strips country code +55 when pasted", () => {
    expect(formatBrazilianPhone("+55 (11) 98888-7777")).toBe("(11) 98888-7777");
    expect(formatBrazilianPhone("5511988887777")).toBe("(11) 98888-7777");
  });

  test("strips leading 0 when pasted", () => {
    expect(formatBrazilianPhone("011988887777")).toBe("(11) 98888-7777");
  });

  test("validates Brazilian cell phone numbers", () => {
    expect(isValidBrazilianPhone("(11) 98888-7777")).toBe(true);
    expect(isValidBrazilianPhone("11988887777")).toBe(true);
    expect(isValidBrazilianPhone("+55 21 99999-8888")).toBe(true);
  });

  test("rejects invalid DDDs or incomplete numbers", () => {
    expect(isValidBrazilianPhone("")).toBe(false);
    expect(isValidBrazilianPhone("12345")).toBe(false);
    expect(isValidBrazilianPhone("(05) 98888-7777")).toBe(false); // Invalid DDD 05
    expect(isValidBrazilianPhone("(11) 78888-7777")).toBe(false); // 11 digits not starting with 9
  });
});
