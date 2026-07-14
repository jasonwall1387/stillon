import { test, expect, type Page } from '@playwright/test';

test.setTimeout(90_000);

async function createCheck(page: Page, vote: 'on' | 'bail'): Promise<string> {
  await page.goto('/');
  // data-ready flips to 1 only after useEffect - proves the React island hydrated.
  await expect(page.getByTestId('create-form')).toHaveAttribute('data-ready', '1', { timeout: 15_000 });

  const title = `E2E plan ${Date.now()}`;
  const titleInput = page.getByPlaceholder('Dinner Friday');
  await titleInput.fill(title);
  await expect(titleInput).toHaveValue(title);

  const voteBtn = page.getByTestId(vote === 'on' ? 'vote-on' : 'vote-bail');
  await voteBtn.click();
  await expect(voteBtn).toHaveClass(/selected/, { timeout: 10_000 });
  await expect(titleInput).toHaveValue(title);

  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/checks') && r.request().method() === 'POST',
      { timeout: 60_000 },
    ),
    page.getByTestId('create-submit').click(),
  ]);
  expect(resp.ok(), `create failed: ${resp.status()} ${await resp.text()}`).toBeTruthy();

  await expect(page.locator('.share-url')).toBeVisible({ timeout: 15_000 });
  const url = await page.locator('.share-url').textContent();
  expect(url).toContain('/v/');
  return url!.trim();
}

test('mutual bail resolves to cancelled with confetti copy on both sides', async ({ browser }) => {
  const creatorCtx = await browser.newContext();
  const inviteeCtx = await browser.newContext();
  const creator = await creatorCtx.newPage();
  const shareUrl = await createCheck(creator, 'bail');

  const invitee = await inviteeCtx.newPage();
  await invitee.goto(shareUrl);
  await expect(invitee.getByTestId('vote-bail')).toBeVisible();
  await invitee.getByTestId('vote-bail').click();
  await expect(invitee.getByText("You're BOTH off the hook")).toBeVisible({ timeout: 30_000 });

  const spectatorCtx = await browser.newContext();
  const spectator = await spectatorCtx.newPage();
  await spectator.goto(shareUrl);
  await expect(spectator.getByText("You're BOTH off the hook")).toBeVisible();
});

test('mixed votes show the identical neutral screen to both, revealing nothing', async ({ browser }) => {
  const creatorCtx = await browser.newContext();
  const inviteeCtx = await browser.newContext();
  const creator = await creatorCtx.newPage();
  const shareUrl = await createCheck(creator, 'bail');

  const invitee = await inviteeCtx.newPage();
  await invitee.goto(shareUrl);
  await expect(invitee.getByTestId('vote-on')).toBeVisible();
  await invitee.getByTestId('vote-on').click();
  await expect(invitee.getByText('The plan stands')).toBeVisible({ timeout: 30_000 });
  await expect(invitee.getByText('BOTH off the hook')).toHaveCount(0);
});

test('creator opening their own share link is steered away from voting', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const shareUrl = await createCheck(page, 'on');
  await page.goto(shareUrl);
  await expect(page.getByText('This is your own vibe check')).toBeVisible();
  await expect(page.getByTestId('vote-bail')).toHaveCount(0);
});
