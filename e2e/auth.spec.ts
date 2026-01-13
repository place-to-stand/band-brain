import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("sign in page loads", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator("h2")).toContainText("Welcome back");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("sign up page loads", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.locator("h2")).toContainText("Create an account");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("can navigate from sign in to sign up", async ({ page }) => {
    await page.goto("/sign-in");
    await page.click('a[href="/sign-up"]');
    await expect(page).toHaveURL("/sign-up");
  });

  test("can navigate from sign up to sign in", async ({ page }) => {
    await page.goto("/sign-up");
    await page.click('a[href="/sign-in"]');
    await expect(page).toHaveURL("/sign-in");
  });
});
