import { test, expect } from "@playwright/test";

test("login page loads and form is available", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /đăng nhập/i })).toBeVisible();
  await expect(page.getByLabel("Email *")).toBeVisible();
  await expect(page.getByLabel("Mật khẩu *")).toBeVisible();
});
