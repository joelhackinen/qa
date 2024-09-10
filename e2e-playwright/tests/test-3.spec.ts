import { test, expect } from '@playwright/test';

test('Adding an answer works', async ({ page }) => {
  await page.goto('http://localhost:7800');
  await page.locator('#CS-E4770-link').click();
  await page.locator('#question-list >> [name=answer-link]').last().click();
  await page.getByRole('textbox').focus()
  await page.locator('[name=answer-input]').fill('Hi!');
  await page.locator('#send-answer-button').click();
  await expect(page.locator('body')).toContainText('Hi!');
});