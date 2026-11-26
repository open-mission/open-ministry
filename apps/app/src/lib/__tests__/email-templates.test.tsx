import { describe, expect, test } from "bun:test";
import * as React from "react";
import { render } from "@react-email/components";
import { BaseEmailLayout } from "@/lib/email/templates/base-layout";
import { RehearsalReminderEmail } from "@/lib/email/templates/rehearsal-reminder-email";
import { WelcomeEmail } from "@/lib/email/templates/welcome-email";
import { AnnouncementEmail } from "@/lib/email/templates/announcement-email";
import { ScheduleAssignedEmail } from "@/lib/email/templates/schedule-assigned-email";
import {
  EMAIL_TEMPLATES,
  renderTemplateHtml,
} from "@/lib/email/templates";

describe("RehearsalReminderEmail", () => {
  const songs = ["Grande é o Senhor", "Teu Sangue"];

  async function renderRehearsal() {
    return render(
      <RehearsalReminderEmail
        name="Ana"
        churchName="Igreja Central"
        eventTitle="Ensaio de Louvor"
        eventDate="Sexta-feira, 20 de Novembro"
        eventTime="19:30"
        location="Templo principal"
        songs={songs}
        notes="Chegar 15 minutos antes."
        rehearsalUrl="https://openministry.app/rehearsals/1"
      />,
    );
  }

  test("renderiza cada música do repertório em uma linha numerada", async () => {
    const html = await renderRehearsal();

    expect(html).toContain("1.");
    expect(html).toContain("Grande é o Senhor");
    expect(html).toContain("2.");
    expect(html).toContain("Teu Sangue");

    // Não deve reaproveitar o formato corrido "Música A, Música B".
    expect(html).not.toContain("Grande é o Senhor, Teu Sangue");
  });

  test("renderiza os detalhes do ensaio em campos separados", async () => {
    const html = await renderRehearsal();

    expect(html).toContain("Ensaio de Louvor");
    expect(html).toContain("Sexta-feira, 20 de Novembro");
    expect(html).toContain("19:30");
    expect(html).toContain("Templo principal");
    expect(html).toContain("Chegar 15 minutos antes.");
  });

  test("omite a seção de repertório quando não há músicas", async () => {
    const html = await render(
      <RehearsalReminderEmail
        churchName="Igreja Central"
        eventTitle="Ensaio de Louvor"
        songs={[]}
      />,
    );

    expect(html).not.toContain("Repertório");
  });
});

describe("BaseEmailLayout - símbolo do app e logo da igreja", () => {
  const appSymbol = "openministry-symbol-black.png";

  test("renderiza o símbolo puro do app quando a igreja não tem logo", async () => {
    const html = await render(
      <BaseEmailLayout churchName="Igreja Central" churchLogo={null}>
        <p>Conteúdo</p>
      </BaseEmailLayout>,
    );

    expect(html).toContain(appSymbol);
    expect(html).toContain('width="30"');
    expect(html).toContain('height="24"');
    expect(html).not.toContain(">OM<");
    expect(html).not.toContain("logoBadge");
  });

  test("exibe o símbolo do app ao lado da logo da igreja", async () => {
    const html = await render(
      <BaseEmailLayout
        churchName="Igreja Central"
        churchLogo="https://utfs.io/f/logo-igreja.png"
      >
        <p>Conteúdo</p>
      </BaseEmailLayout>,
    );

    expect(html).toContain(appSymbol);
    expect(html).toContain("https://utfs.io/f/logo-igreja.png");
    expect(html).not.toContain(">OM<");
    expect(html).not.toContain("logoBadge");
  });

  test("prioriza a URL de appLogoUrl quando informada", async () => {
    const html = await render(
      <BaseEmailLayout
        churchName="Igreja Central"
        appLogoUrl="https://cdn.openministry.test/brand/simbolo.png"
      >
        <p>Conteúdo</p>
      </BaseEmailLayout>,
    );

    expect(html).toContain("https://cdn.openministry.test/brand/simbolo.png");
    expect(html).not.toContain(appSymbol);
    expect(html).not.toContain(">OM<");
  });
});

describe("registro do template de lembrete de ensaio", () => {
  test("está registrado em EMAIL_TEMPLATES", () => {
    expect(EMAIL_TEMPLATES.rehearsal_reminder).toBeDefined();
    expect(EMAIL_TEMPLATES.rehearsal_reminder.category).toBe("escala");
  });

  test("renderTemplateHtml aceita a key rehearsal_reminder", async () => {
    const { html, subject } = await renderTemplateHtml("rehearsal_reminder", {
      churchName: "Igreja Central",
      eventTitle: "Ensaio de Louvor",
    });

    expect(html).toContain("Lembrete de Ensaio");
    expect(subject).toContain("Ensaio de Louvor");
  });
});

describe("templates de notificação repassam a logo da igreja", () => {
  const churchLogo = "https://utfs.io/f/logo-igreja.png";

  test("welcome", async () => {
    const html = await render(
      <WelcomeEmail name="Ana" churchName="Igreja Central" churchLogo={churchLogo} />,
    );

    expect(html).toContain("openministry-symbol-black.png");
    expect(html).toContain(churchLogo);
    expect(html).not.toContain(">OM<");
  });

  test("announcement", async () => {
    const html = await render(
      <AnnouncementEmail
        name="Ana"
        churchName="Igreja Central"
        churchLogo={churchLogo}
        title="Aviso"
        body="Conteúdo"
      />,
    );

    expect(html).toContain("openministry-symbol-black.png");
    expect(html).toContain(churchLogo);
    expect(html).not.toContain(">OM<");
  });

  test("assignment", async () => {
    const html = await render(
      <ScheduleAssignedEmail
        name="Ana"
        churchName="Igreja Central"
        churchLogo={churchLogo}
        eventTitle="Culto"
        functionName="Louvor"
        eventDate="Domingo"
        eventTime="19:00"
        eventUrl="https://openministry.app/events/1"
      />,
    );

    expect(html).toContain("openministry-symbol-black.png");
    expect(html).toContain(churchLogo);
    expect(html).not.toContain(">OM<");
  });
});

describe("todos os templates usam o símbolo puro do app", () => {
  const customAppLogoUrl =
    "https://cdn.openministry.test/brand/openministry-symbol-black.png";

  for (const [key, meta] of Object.entries(EMAIL_TEMPLATES)) {
    test(`${key} renderiza o símbolo padrão sem o badge OM`, async () => {
      const html = await render(meta.renderComponent({ ...meta.sampleData }));

      expect(html).toContain("openministry-symbol-black.png");
      expect(html).not.toContain(">OM<");
      expect(html).not.toContain("logoBadge");
    });

    test(`${key} repassa appLogoUrl customizado`, async () => {
      const html = await render(
        meta.renderComponent({ ...meta.sampleData, appLogoUrl: customAppLogoUrl }),
      );

      expect(html).toContain(customAppLogoUrl);
      expect(html).not.toContain(">OM<");
    });
  }
});
