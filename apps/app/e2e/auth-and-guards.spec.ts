import { expect, test } from "@playwright/test";

test.describe("Autenticação, rotas protegidas e endpoints públicos", () => {
  test("GET /api/health responde 200 com status ok", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const payload = await response.json();
    expect(payload.status).toBe("ok");
    expect(typeof payload.timestamp).toBe("string");
  });

  test("GET /api/calendar/feed/token-invalido-e2e responde 404", async ({
    request,
  }) => {
    const response = await request.get("/api/calendar/feed/token-invalido-e2e");
    expect(response.status()).toBe(404);
  });

  test("/login renderiza campos acessíveis, toggle de senha e validação", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "Bem-vindo de volta" }),
    ).toBeVisible();

    const identifierInput = page.getByLabel("Email ou nome de usuário");
    const passwordInput = page.locator("#password");
    const submitButton = page.getByRole("button", { name: "Entrar", exact: true });

    await expect(identifierInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");
    await expect(submitButton).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Criar minha igreja" }),
    ).toHaveAttribute("href", "/signup");

    // Envio com campos vazios deve ser bloqueado pela validação nativa HTML5
    await submitButton.click();
    await expect(page).toHaveURL(/\/login$/);
    const missingIdentifier = await identifierInput.evaluate(
      (el) => (el as HTMLInputElement).validity.valueMissing,
    );
    expect(missingIdentifier).toBe(true);

    // Toggle de exibição de senha
    const showPasswordButton = page.getByRole("button", {
      name: "Exibir senha",
    });
    await showPasswordButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await expect(
      page.getByRole("button", { name: "Ocultar senha" }),
    ).toBeVisible();

    // Envio com espaços em branco aciona validação server-side sem quebrar
    await identifierInput.fill("   ");
    await passwordInput.fill("   ");
    await submitButton.click();
    await expect(
      page.getByText("Informe seu email ou nome de usuário."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("/signup renderiza formulário de cadastro acessível", async ({
    page,
  }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("heading", { name: "Crie sua conta" }),
    ).toBeVisible();
    await expect(page.getByLabel("Nome completo")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#password")).toHaveAttribute("required", "");
  });

  for (const protectedRoute of [
    "/",
    "/calendar",
    "/schedules",
    "/settings",
    "/platform",
  ]) {
    test(`redireciona ${protectedRoute} para /login quando deslogado`, async ({
      page,
    }) => {
      await page.goto(protectedRoute);
      await expect(page).toHaveURL(/\/login(\?|$)/);
    });
  }

  for (const [source, expectedPathname] of [
    ["/dashboard", "/"],
    ["/dashboard/songs", "/songs"],
    ["/dashboard/avisos", "/announcements"],
    ["/avisos", "/announcements"],
    ["/dashboard/events", "/calendar"],
    ["/dashboard/events/abc-123", "/events/abc-123"],
  ] as const) {
    test(`redireciona ${source} com 308 para ${expectedPathname}`, async ({
      request,
    }) => {
      const response = await request.get(source, { maxRedirects: 0 });
      expect(response.status()).toBe(308);

      const location = response.headers()["location"] ?? "";
      expect(location.startsWith("//")).toBe(false);

      const resolved = new URL(location, "http://127.0.0.1");
      expect(resolved.hostname).toBe("127.0.0.1");
      expect(resolved.pathname).toBe(expectedPathname);
    });
  }

  test("bloqueia open redirect em /dashboard//evil.com", async ({
    request,
  }) => {
    const response = await request.get("/dashboard//evil.com", {
      maxRedirects: 0,
    });
    const location = response.headers()["location"] ?? "";

    expect(location.startsWith("//")).toBe(false);
    if (location) {
      const resolved = new URL(location, "http://127.0.0.1");
      expect(resolved.hostname).toBe("127.0.0.1");
    }
  });
});
