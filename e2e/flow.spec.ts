import { test, expect, type Page } from '@playwright/test';

async function createCheck(page: Page, vote: 'Still on' | "I'd bail"): Promise<string> {
  await page.goto('/');
  await page.getByPlaceholder('Dinner Friday').fill(`E2E plan ${Date.now()}`);
  await page.getByRole('button', { name: vote }).click();
  await page.getByRole('button', { name: 'Start a vibe check' }).click();
  const url = await page.locator('.share-url').textContent();
  expect(url).toContain('/v/');
  return url!.trim();
}

test('mutual bail resolves to cancelled with confetti copy on both sides', async ({ browser }) => {
  const creatorCtx = await browser.newContext();
  const inviteeCtx = await browser.newContext();
  const creator = await creatorCtx.newPage();
  const shareUrl = await createCheck(creator, "I'd bail");

  const invitee = await inviteeCtx.newPage();
  await invitee.goto(shareUrl);
  await invitee.getByRole('button', { name: "I'd bail" }).click();
  await expect(invitee.getByText("You're BOTH off the hook")).toBeVisible();

  // Spectator (fresh context) sees the terminal state too.
  const spectatorCtx = await browser.newContext();
  const spectator = await spectatorCtx.newPage();
  await spectator.goto(shareUrl);
  await expect(spectator.getByText("You're BOTH off the hook")).toBeVisible();
});

test('mixed votes show the identical neutral screen to both, revealing nothing', async ({ browser }) => {
  const creatorCtx = await browser.newContext();
  const inviteeCtx = await browser.newContext();
  const creator = await creatorCtx.newPage();
  const shareUrl = await createCheck(creator, "I'd bail");

  const invitee = await inviteeCtx.newPage();
  await invitee.goto(shareUrl);
  await invitee.getByRole('button', { name: 'Still on' }).click();
  await expect(invitee.getByText('The plan stands')).toBeVisible();
  await expect(invitee.getByText('BOTH off the hook')).toHaveCount(0);
});

test('creator opening their own share link is steered away from voting', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const shareUrl = await createCheck(page, 'Still on');
  await page.goto(shareUrl); // same context = has the so_own cookie
  await expect(page.getByText('This is your own vibe check')).toBeVisible();
  await expect(page.getByRole('button', { name: "I'd bail" })).toHaveCount(0);
});
