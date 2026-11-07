import { describe, expect, test } from "bun:test";
import {
  interpolateTemplate,
  buildWhatsAppShareUrl,
  TEMPLATE_DEFINITIONS,
  type MessageTemplateType,
} from "@/lib/message-templates";

describe("Message Templates Engine", () => {
  test("interpolateTemplate replaces variables correctly", () => {
    const template = "Olá, {{name}}! Bem-vindo à {{church_name}}. Acesse {{link}}.";
    const result = interpolateTemplate(template, {
      name: "Gabriel",
      church_name: "Igreja da Cidade",
      link: "https://openministry.app",
    });

    expect(result).toBe("Olá, Gabriel! Bem-vindo à Igreja da Cidade. Acesse https://openministry.app.");
  });

  test("interpolateTemplate handles spaces inside braces {{ variable }}", () => {
    const template = "Olá, {{ name }}! Seu papel é {{  role }}.";
    const result = interpolateTemplate(template, {
      name: "Ana",
      role: "Líder",
    });

    expect(result).toBe("Olá, Ana! Seu papel é Líder.");
  });

  test("interpolateTemplate handles missing variables gracefully", () => {
    const template = "Olá, {{name}}! Data: {{date}}.";
    const result = interpolateTemplate(template, {
      name: "Carlos",
    });

    expect(result).toBe("Olá, Carlos! Data: .");
  });

  test("buildWhatsAppShareUrl formats Brazilian phone numbers with country code", () => {
    const url = buildWhatsAppShareUrl({
      phone: "(11) 98888-7777",
      text: "Olá mundo!",
    });

    expect(url).toBe("https://wa.me/5511988887777?text=Ol%C3%A1%20mundo!");
  });

  test("buildWhatsAppShareUrl works without phone number", () => {
    const url = buildWhatsAppShareUrl({
      text: "Convite oficial",
    });

    expect(url).toBe("https://wa.me/?text=Convite%20oficial");
  });

  test("TEMPLATE_DEFINITIONS defines all 7 official template types", () => {
    const expectedTypes: MessageTemplateType[] = [
      "invite_church",
      "save_contact",
      "invite_department",
      "assignment",
      "monthly_availability",
      "welcome",
      "announcement",
    ];

    for (const type of expectedTypes) {
      const def = TEMPLATE_DEFINITIONS[type];
      expect(def).toBeDefined();
      expect(def.title.length).toBeGreaterThan(0);
      expect(def.defaultContent.length).toBeGreaterThan(10);
      expect(def.variables.length).toBeGreaterThan(0);
    }
  });

  test("save_contact template contains guidance to save church contact", () => {
    const def = TEMPLATE_DEFINITIONS.save_contact;
    expect(def.defaultContent).toContain("Adicione e salve este número nos seus contatos");
    expect(def.defaultContent).toContain("spam");
  });
});
