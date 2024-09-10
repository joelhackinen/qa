import { test, expect } from '@playwright/test';

test('Same question can only be voted once', async ({ page }) => {
  let dialogShown = false;
  await page.goto('http://localhost:7800/');
  await page.locator('#CS-E4770-link').click();

  page.on('dialog', async (dialog) => {
    expect(dialog.type()).toBe('alert');

    await dialog.accept();
    dialogShown = true;
  });

  const votebox = page.locator('#question-list >> [name=votebox]').last();
  const upvotebutton = votebox.getByRole('button').first();
  const preClickValue = await votebox.textContent();
  await upvotebutton.click();
  await upvotebutton.click();
  const postClickValue = await votebox.textContent();
  expect(Number(postClickValue)).toBe(Number(preClickValue) + 1);
  expect(dialogShown).toBe(true);
});