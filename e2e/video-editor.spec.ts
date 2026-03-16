import { test, expect, Page } from '@playwright/test';
import path from 'path';

const SCREENSHOTS = path.join(__dirname, 'screenshots');

// ──────────────────────────────────────────────────────────────────────────────
// Helper: capture a named screenshot to e2e/screenshots/
// ──────────────────────────────────────────────────────────────────────────────
async function snap(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOTS, `${name}.png`),
    fullPage: false,
  });
  console.log(`  [screenshot] ${name}.png`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Collect console errors throughout a test
// ──────────────────────────────────────────────────────────────────────────────
function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
  return errors;
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. PROJECT LIST PAGE
// ──────────────────────────────────────────────────────────────────────────────
test('1. Project list page loads correctly', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Page title
  await expect(page).toHaveTitle(/Video Editor/i);

  // Header branding
  await expect(page.locator('header')).toBeVisible();

  // "New Project" button must be visible
  const newProjectBtn = page.getByRole('button', { name: /new project/i });
  await expect(newProjectBtn).toBeVisible();

  await snap(page, '01-project-list-page');

  // Report console errors but do not fail — we just surface them
  if (errors.length > 0) {
    console.warn(`Console errors on project list page:\n  ${errors.join('\n  ')}`);
  }

  expect(errors.filter((e) => !e.includes('DevTools'))).toHaveLength(0);
});

// ──────────────────────────────────────────────────────────────────────────────
// 2. NEW PROJECT → EDITOR NAVIGATION
// ──────────────────────────────────────────────────────────────────────────────
test('2. Clicking "New Project" navigates to the editor', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const newProjectBtn = page.getByRole('button', { name: /new project/i });
  await expect(newProjectBtn).toBeVisible();

  await snap(page, '02a-project-list-before-click');

  await newProjectBtn.click();

  // Wait for URL to change to /editor?id=...
  await page.waitForURL(/\/editor\?id=/, { timeout: 15_000 });

  const url = page.url();
  expect(url).toMatch(/\/editor\?id=/);

  console.log(`  Editor URL: ${url}`);
  await snap(page, '02b-editor-navigated');

  if (errors.length > 0) {
    console.warn(`Console errors during navigation:\n  ${errors.join('\n  ')}`);
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// 3. EDITOR LAYOUT
// ──────────────────────────────────────────────────────────────────────────────
test('3. Editor layout — all panels visible', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  // Navigate via project list to get a real project ID
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /new project/i }).click();
  await page.waitForURL(/\/editor\?id=/, { timeout: 15_000 });

  // Wait until the loading spinner disappears (editor is ready)
  await expect(page.getByText(/Initializing project/i)).not.toBeVisible({ timeout: 15_000 });

  await snap(page, '03a-editor-full-layout');

  // TopBar: branding text visible
  const topBarBrand = page.locator('text=VideoEditor');
  await expect(topBarBrand).toBeVisible();

  // Project name is displayed as a button (click-to-edit pattern)
  // Verify it exists as a button with a title attribute
  const projectNameBtn = page.locator('button[title="Click to rename project"]');
  await expect(projectNameBtn).toBeVisible();
  console.log(`  Project name button text: "${await projectNameBtn.textContent()}"`);

  // SaveIndicator — may say "Saving…" or "Saved" or be absent (idle)
  // We look for either text or accept that it is idle
  const saveText = page.locator('text=/Saving|Saved/');
  const saveVisible = await saveText.isVisible().catch(() => false);
  console.log(`  Save indicator visible: ${saveVisible}`);
  if (saveVisible) {
    await snap(page, '03b-save-indicator-visible');
  }

  // Left panel — "MEDIA" heading (uppercase in UI)
  const mediaPanel = page.locator('h2').filter({ hasText: /^Media$/i }).first();
  await expect(mediaPanel).toBeVisible();

  // Center canvas area (the dark preview region with bg-neutral-950)
  const canvasArea = page.locator('.bg-neutral-950').first();
  await expect(canvasArea).toBeVisible();

  // Right panel — "PROPERTIES" heading
  const propertiesPanel = page.locator('h2').filter({ hasText: /^Properties$/i }).first();
  await expect(propertiesPanel).toBeVisible();

  // Bottom — Timeline: verify the timeline region (border-t border-neutral-700 h-64)
  // The Timeline renders a scrollable canvas area; check the outer wrapper height
  const timelineWrapper = page.locator('div.h-64').first();
  await expect(timelineWrapper).toBeVisible();

  await snap(page, '03c-editor-panels-verified');

  if (errors.length > 0) {
    console.warn(`Console errors in editor:\n  ${errors.join('\n  ')}`);
  }
  expect(errors.filter((e) => !e.includes('DevTools'))).toHaveLength(0);
});

// ──────────────────────────────────────────────────────────────────────────────
// 4. EXPORT MODAL
// ──────────────────────────────────────────────────────────────────────────────
test('4. Export modal — open, verify controls, close', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /new project/i }).click();
  await page.waitForURL(/\/editor\?id=/, { timeout: 15_000 });
  await expect(page.getByText(/Initializing project/i)).not.toBeVisible({ timeout: 15_000 });

  await snap(page, '04a-before-export-click');

  // Click the Export button in the TopBar
  const exportBtn = page.getByRole('button', { name: /export/i });
  await expect(exportBtn).toBeVisible();
  await exportBtn.click();

  // Modal should appear
  const modal = page.locator('text=Export Video');
  await expect(modal).toBeVisible({ timeout: 5_000 });

  await snap(page, '04b-export-modal-open');

  // Resolution controls
  for (const res of ['480p', '720p', '1080p', '4k']) {
    await expect(page.getByRole('button', { name: res })).toBeVisible();
  }

  // FPS controls
  for (const fps of ['24', '25', '30', '60']) {
    await expect(page.getByRole('button', { name: fps })).toBeVisible();
  }

  // Quality slider
  const qualitySlider = page.locator('input[type="range"]');
  await expect(qualitySlider).toBeVisible();

  // "Full timeline" range button
  await expect(page.getByRole('button', { name: /full timeline/i })).toBeVisible();

  await snap(page, '04c-export-modal-controls-verified');

  // Close the modal via the X button (SVG close icon in header)
  const closeBtn = page.locator('button').filter({
    has: page.locator('svg line[x1="18"]'),
  }).first();

  if (await closeBtn.isVisible()) {
    await closeBtn.click();
  } else {
    // Fallback: click the Cancel button at the bottom
    await page.getByRole('button', { name: /^cancel$/i }).click();
  }

  await expect(modal).not.toBeVisible({ timeout: 3_000 });

  await snap(page, '04d-export-modal-closed');

  if (errors.length > 0) {
    console.warn(`Console errors during export modal:\n  ${errors.join('\n  ')}`);
  }
  expect(errors.filter((e) => !e.includes('DevTools'))).toHaveLength(0);
});

// ──────────────────────────────────────────────────────────────────────────────
// 5. KEYBOARD SHORTCUTS — no crash
// ──────────────────────────────────────────────────────────────────────────────
test('5. Keyboard shortcuts do not crash the app', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /new project/i }).click();
  await page.waitForURL(/\/editor\?id=/, { timeout: 15_000 });
  await expect(page.getByText(/Initializing project/i)).not.toBeVisible({ timeout: 15_000 });

  // Focus the page body (not an input)
  await page.locator('body').click();

  await snap(page, '05a-before-keyboard-shortcuts');

  // Space
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  await snap(page, '05b-after-space');

  // Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await snap(page, '05c-after-escape');

  // ArrowLeft
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);
  await snap(page, '05d-after-arrowleft');

  // ArrowRight
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await snap(page, '05e-after-arrowright');

  // After all key presses the editor must still be functional
  await expect(page.locator('body')).toBeVisible();
  await expect(page.url()).toMatch(/\/editor\?id=/);

  if (errors.length > 0) {
    console.warn(`Console errors after keyboard shortcuts:\n  ${errors.join('\n  ')}`);
  }
  expect(errors.filter((e) => !e.includes('DevTools'))).toHaveLength(0);
});

// ──────────────────────────────────────────────────────────────────────────────
// 6. ERROR STATE — nonexistent project ID
// ──────────────────────────────────────────────────────────────────────────────
test('6. Error state for nonexistent project ID', async ({ page }) => {
  const errors = trackConsoleErrors(page);

  await page.goto('/editor?id=nonexistent');

  // Wait for the error UI to appear (the component shows an error after the
  // fetchProject call rejects)
  const failedText = page.locator('text=Failed to connect to server');
  await expect(failedText).toBeVisible({ timeout: 15_000 });

  await snap(page, '06a-error-state');

  // "Back to projects" button
  const backBtn = page.getByRole('button', { name: /back to projects/i });
  await expect(backBtn).toBeVisible();

  // "Retry" button
  const retryBtn = page.getByRole('button', { name: /retry/i });
  await expect(retryBtn).toBeVisible();

  await snap(page, '06b-error-buttons-verified');

  // Click "Back to projects" and verify we return to the home page
  await backBtn.click();
  await page.waitForURL('/', { timeout: 10_000 });
  await expect(page.getByRole('button', { name: /new project/i })).toBeVisible();

  await snap(page, '06c-back-to-projects');

  // We expect network errors in this scenario — filter those out when checking
  const nonNetworkErrors = errors.filter(
    (e) =>
      !e.includes('DevTools') &&
      !e.includes('404') &&
      !e.includes('NetworkError') &&
      !e.includes('Failed to fetch') &&
      !e.includes('nonexistent'),
  );
  if (nonNetworkErrors.length > 0) {
    console.warn(`Unexpected console errors on error page:\n  ${nonNetworkErrors.join('\n  ')}`);
  }
  expect(nonNetworkErrors).toHaveLength(0);
});

// ──────────────────────────────────────────────────────────────────────────────
// 7. SAVE INDICATOR — appears after project creation
// ──────────────────────────────────────────────────────────────────────────────
test('7. Save indicator appears in the TopBar', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /new project/i }).click();
  await page.waitForURL(/\/editor\?id=/, { timeout: 15_000 });
  await expect(page.getByText(/Initializing project/i)).not.toBeVisible({ timeout: 15_000 });

  // Trigger a save by clicking the project name button to enter edit mode
  const projectNameBtn = page.locator('button[title="Click to rename project"]');
  await expect(projectNameBtn).toBeVisible();
  await projectNameBtn.click();

  // Now the input field should appear
  const nameInput = page.locator('input.bg-neutral-800').first();
  await expect(nameInput).toBeVisible({ timeout: 3_000 });
  await nameInput.fill('Test Project Save');
  await nameInput.press('Enter');

  // Wait for "Saving…" or "Saved" to appear
  const saveIndicator = page.locator('text=/Saving|Saved/');
  await expect(saveIndicator).toBeVisible({ timeout: 10_000 });
  await snap(page, '07a-save-indicator-saving');

  // Eventually it should settle on "Saved"
  await expect(page.locator('text=Saved')).toBeVisible({ timeout: 10_000 });
  await snap(page, '07b-save-indicator-saved');

  console.log('  Save indicator cycle: Saving -> Saved — PASS');
});
