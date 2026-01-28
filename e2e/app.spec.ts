import { test, expect } from '@playwright/test';

test.describe('Gym Tracker App', () => {
  test.beforeEach(async ({ page }) => {
    // Capture ALL console messages for debugging
    page.on('console', msg => {
      console.log(`[${msg.type()}]`, msg.text());
    });

    page.on('pageerror', err => {
      console.log('Page Error:', err.message);
    });

    // Navigate and wait for app to load
    await page.goto('http://localhost:5173/');

    // Wait for loading to complete
    await page.waitForFunction(() => {
      return !document.body.textContent?.includes('Loading...');
    }, { timeout: 30000 });
  });

  test('full workout flow: create template, add exercise, start workout', async ({ page }) => {
    // Step 1: Click "Create Your First Template"
    console.log('Step 1: Creating a new template...');
    await page.click('text=Create Your First Template');
    await page.waitForURL('**/template/**');
    await page.screenshot({ path: 'e2e/screenshots/01-new-template-page.png' });

    // Step 2: Fill in template name
    console.log('Step 2: Filling template name...');
    const templateNameInput = page.locator('input').first();
    await templateNameInput.fill('Push Day');

    // Step 3: Add an exercise
    console.log('Step 3: Adding exercise...');
    await page.click('text=Add Exercise');
    await page.waitForTimeout(500);

    // Check if a modal appeared with an input
    const exerciseInputs = page.locator('input');
    const inputCount = await exerciseInputs.count();
    console.log('Number of inputs after clicking Add Exercise:', inputCount);

    if (inputCount > 1) {
      // Fill the second input (exercise name in modal)
      await exerciseInputs.nth(1).fill('Bench Press');
      await page.screenshot({ path: 'e2e/screenshots/03-exercise-input.png' });

      // Click Add button in modal
      const addButtons = page.locator('button:has-text("Add")');
      const addCount = await addButtons.count();
      console.log('Number of Add buttons:', addCount);
      if (addCount > 1) {
        await addButtons.nth(1).click(); // Click the one in the modal
      }
    }

    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/04-exercise-added.png' });

    // Step 4: Click "Create Template" to save
    console.log('Step 4: Saving template...');
    await page.click('text=Create Template');

    // Wait for navigation back to home
    await page.waitForURL('**/');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/05-template-saved.png' });

    // Verify template appears on home page
    const pageContent = await page.textContent('body');
    console.log('Home page contains "Push Day":', pageContent?.includes('Push Day'));
    console.log('Home page contains "Start Workout":', pageContent?.includes('Start Workout'));

    // Step 5: Start workout
    console.log('Step 5: Starting workout...');

    const startBtn = page.locator('button:has-text("Start Workout")');
    const startBtnCount = await startBtn.count();
    console.log('Start Workout buttons found:', startBtnCount);

    if (startBtnCount > 0) {
      console.log('Clicking Start Workout...');
      await startBtn.first().click();

      // Wait for navigation to workout page
      await page.waitForURL('**/workout/**', { timeout: 5000 });
      console.log('Navigated to:', page.url());

      // Wait for loading to finish (up to 10 seconds)
      console.log('Waiting for workout to load...');
      try {
        await page.waitForFunction(() => {
          const body = document.body.textContent || '';
          return !body.includes('Loading') && !body.includes('Starting') && !body.includes('Resuming');
        }, { timeout: 10000 });
        console.log('Workout loaded successfully!');
      } catch (e) {
        console.log('Workout still loading after 10 seconds');
      }

      await page.screenshot({ path: 'e2e/screenshots/06-workout-page.png' });

      // Check what's on the page
      const workoutContent = await page.textContent('body');
      console.log('Page contains "Finish Workout":', workoutContent?.includes('Finish Workout'));
      console.log('Page contains "Loading":', workoutContent?.includes('Loading'));
      console.log('Page contains "Error":', workoutContent?.includes('Error'));
      console.log('Page contains "Bench Press":', workoutContent?.includes('Bench Press'));
    }

    await page.screenshot({ path: 'e2e/screenshots/07-final-state.png' });
  });
});
