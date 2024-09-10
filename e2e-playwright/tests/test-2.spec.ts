import { test, expect } from '@playwright/test';

test('Main page renders', async ({ page }) => {
  await page.goto('http://localhost:7800/');
  await expect(page.getByRole('navigation')).toContainText('Q&A platform');
});