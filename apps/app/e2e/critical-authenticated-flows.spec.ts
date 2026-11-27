import { expect, test } from "@playwright/test";

const e2eEmail = process.env.E2E_USER_EMAIL?.trim();
const e2ePassword = process.env.E2E_USER_PASSWORD;

test.describe("Fluxos críticos autenticados", () => {
  test.skip(
    !e2eEmail || !e2ePassword,
    "Defina E2E_USER_EMAIL e E2E_USER_PASSWORD para executar os fluxos autenticados E2E.",
  );

  test("login -> eventos/escalas -> /platform -> configurações WhatsApp", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    // 1. Login real
    await page.goto("/login");
    await page.getByLabel("Email ou nome de usuário").fill(e2eEmail!);
    await page.locator("#password").fill(e2ePassword!);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 20_000,
    });

    // 2. Consulta / abertura de diálogo de evento e consulta de escalas
    await page.goto("/calendar");
    await expect(page.locator("body")).toBeVisible();
    const createEventButton = page.getByRole("button", {
      name: /Novo culto ou evento/i,
    });
    if (await createEventButton.isVisible().catch(() => false)) {
      await createEventButton.click();
      await expect(
        page.getByRole("heading", { name: /Novo culto ou evento/i }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    }

    await page.goto("/schedules");
    await expect(page.locator("body")).toBeVisible();

    // 3. Painel da Plataforma (acessa se super_admin; redireciona limpo para / se membro comum)
    await page.goto("/platform");
    await expect(page).toHaveURL(/\/(platform|$)/);
    await expect(page.locator("body")).toBeVisible();

    // 4. Configurações de WhatsApp da igreja
    await page.goto("/settings?scope=church&tab=whatsapp");
    await expect(page.locator("body")).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});
