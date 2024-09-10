import { test, expect } from '@playwright/test';

test('Question upvoting works', async ({ page }) => {
  await page.goto('http://localhost:7800/');
  await page.locator('#CS-E4770-link').click();
  const votebox = page.locator('#question-list >> [name=votebox]').last();
  const upvotebutton = votebox.getByRole('button').first();
  const preClickValue = await votebox.textContent();
  await upvotebutton.click();
  const postClickValue = await votebox.textContent();
  expect(Number(postClickValue)).toBe(Number(preClickValue) + 1);
});