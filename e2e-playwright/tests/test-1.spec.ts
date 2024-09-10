import { test, expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

test('Rate limit of asking questions', async ({ page }) => {
  const addQuestion = async (message: string) => {
    await page.getByRole("textbox").focus();
    await page.locator('[name=question-input]').click();
    await page.locator('#question-input').fill(message);
    await page.locator('#send-question-button').click();
  };

  await page.goto('http://localhost:7800/');

  await page.locator('#CS-E4770-link').click();
  
  const firstMessage = uuidv4();
  await addQuestion(firstMessage);
  await expect(page.locator('body')).toContainText(firstMessage);

  const secondMessage = uuidv4();
  await addQuestion(secondMessage);

  await expect(page.locator('body')).not.toContainText(secondMessage);
});