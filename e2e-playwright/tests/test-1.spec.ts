import { test, expect } from '@playwright/test';

test('Rate limit of asking questions', async ({ page }) => {
  const addQuestion = async () => {
    await page.getByRole("textbox").focus();
    await page.locator('[name=question-input]').click();
    await page.locator('#question-input').fill('Hi!');
    await page.locator('#send-question-button').click();
  };
  let dialogShown = false;

  page.on('dialog', async (dialog) => {
    expect(dialog.type()).toBe('alert');

    await dialog.accept();
    dialogShown = true;
  });

  await page.goto('http://localhost:7800/');
  await page.locator('#CS-E4770-link').click();
  
  await addQuestion();
  await addQuestion();
  
  await expect(page.locator('body')).toContainText('Hi!');
  expect(dialogShown).toBe(true);
});