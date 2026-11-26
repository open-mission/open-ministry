import { expect, test } from "@playwright/test";

const PUBLIC_ROUTES = ["/login", "/signup", "/brand"] as const;

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
] as const;

test.describe("Rotas públicas sem login — desktop e mobile", () => {
  for (const viewport of VIEWPORTS) {
    for (const route of PUBLIC_ROUTES) {
      test(`${route} em ${viewport.name} (${viewport.width}x${viewport.height}) sem erros nem overflow`, async ({
        page,
      }) => {
        const consoleErrors: string[] = [];
        const pageErrors: string[] = [];

        page.on("console", (msg) => {
          if (msg.type() === "error") {
            consoleErrors.push(msg.text());
          }
        });
        page.on("pageerror", (error) => {
          pageErrors.push(error.message);
        });

        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });

        const response = await page.goto(route, { waitUntil: "networkidle" });
        expect(response?.status()).toBeLessThan(400);

        await expect(page.locator("body")).toBeVisible();
        const headingCount = await page.getByRole("heading").count();
        expect(headingCount).toBeGreaterThan(0);

        const layoutMetrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(layoutMetrics.scrollWidth).toBeLessThanOrEqual(
          layoutMetrics.clientWidth,
        );

        expect(consoleErrors).toEqual([]);
        expect(pageErrors).toEqual([]);
      });
    }
  }
});
