import { test, expect } from "@playwright/test";

test("switch to French and back; untranslated pages stay RTL with a notice", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: "Français" }).click();
  await expect(page.getByRole("heading", { name: "Le vrai besoin, au bon moment." })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await page.goto("/submit");
  await expect(page.getByLabel("Texte de l'appel *")).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Politique de confidentialité" })).toBeVisible();
  await page.goto("/clubs");
  await expect(page.getByText("Cette page n'est pas encore traduite")).toBeVisible();
  await expect(page.locator('main [dir="rtl"]').first()).toBeVisible();
  await page.getByRole("button", { name: "العربية" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});
