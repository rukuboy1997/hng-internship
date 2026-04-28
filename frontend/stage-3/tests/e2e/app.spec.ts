import { test, expect } from '@playwright/test'

const TEST_EMAIL = `test-${Date.now()}@example.com`
const TEST_PASSWORD = 'TestPass123!'

async function signupAndLogin(page: import('@playwright/test').Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await page.goto('/signup')
  await page.getByTestId('auth-signup-email').fill(email)
  await page.getByTestId('auth-signup-password').fill(password)
  await page.getByTestId('auth-signup-submit').click()
  await page.waitForURL('**/dashboard', { timeout: 10000 })
}

async function clearStorage(page: import('@playwright/test').Page) {
  await page.evaluate(() => localStorage.clear())
}

test.describe('Habit Tracker app', () => {
  test('shows the splash screen and redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/')
    const splash = page.getByTestId('splash-screen')
    await expect(splash).toBeVisible()
    expect(await splash.innerText()).toContain('Habit Tracker')
    await page.waitForURL('**/login', { timeout: 5000 })
    expect(page.url()).toContain('/login')
  })

  test('redirects authenticated users from / to /dashboard', async ({ page }) => {
    await page.addInitScript(() => {
      const session = { userId: 'user-init', email: 'init@example.com' }
      localStorage.setItem('habit-tracker-session', JSON.stringify(session))
    })
    await page.goto('/')
    await page.waitForURL('**/dashboard', { timeout: 5000 })
    expect(page.url()).toContain('/dashboard')
  })

  test('prevents unauthenticated access to /dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('**/login', { timeout: 5000 })
    expect(page.url()).toContain('/login')
  })

  test('signs up a new user and lands on the dashboard', async ({ page }) => {
    const email = `signup-${Date.now()}@example.com`
    await page.goto('/signup')
    await page.getByTestId('auth-signup-email').fill(email)
    await page.getByTestId('auth-signup-password').fill('Password123!')
    await page.getByTestId('auth-signup-submit').click()
    await page.waitForURL('**/dashboard', { timeout: 10000 })

    await expect(page.getByTestId('dashboard-page')).toBeVisible()
    await expect(page.getByTestId('empty-state')).toBeVisible()

    const session = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('habit-tracker-session') ?? 'null')
    )
    expect(session).not.toBeNull()
    expect(session.email).toBe(email)
  })

  test('logs in an existing user and loads only that user\'s habits', async ({ page }) => {
    const userAEmail = `user-a-${Date.now()}@example.com`
    const userBEmail = `user-b-${Date.now()}@example.com`

    await page.addInitScript(
      ({ aEmail, bEmail }) => {
        const userA = { id: 'user-a', email: aEmail, password: 'pass123', createdAt: new Date().toISOString() }
        const userB = { id: 'user-b', email: bEmail, password: 'pass123', createdAt: new Date().toISOString() }
        const habits = [
          { id: 'h-a', userId: 'user-a', name: 'User A Habit', description: '', frequency: 'daily', createdAt: new Date().toISOString(), completions: [] },
          { id: 'h-b', userId: 'user-b', name: 'User B Habit', description: '', frequency: 'daily', createdAt: new Date().toISOString(), completions: [] },
        ]
        localStorage.setItem('habit-tracker-users', JSON.stringify([userA, userB]))
        localStorage.setItem('habit-tracker-habits', JSON.stringify(habits))
      },
      { aEmail: userAEmail, bEmail: userBEmail }
    )

    await page.goto('/login')
    await page.getByTestId('auth-login-email').fill(userAEmail)
    await page.getByTestId('auth-login-password').fill('pass123')
    await page.getByTestId('auth-login-submit').click()
    await page.waitForURL('**/dashboard', { timeout: 10000 })

    await expect(page.getByTestId('habit-card-user-a-habit')).toBeVisible()
    await expect(page.getByTestId('habit-card-user-b-habit')).not.toBeVisible()
  })

  test('creates a habit from the dashboard', async ({ page }) => {
    await signupAndLogin(page, `create-habit-${Date.now()}@example.com`)

    await page.getByTestId('create-habit-button').click()
    await expect(page.getByTestId('habit-form')).toBeVisible()

    await page.getByTestId('habit-name-input').fill('Exercise Daily')
    await page.getByTestId('habit-description-input').fill('30 minutes workout')
    await page.getByTestId('habit-save-button').click()

    await expect(page.getByTestId('habit-card-exercise-daily')).toBeVisible()
    await expect(page.getByTestId('habit-streak-exercise-daily')).toBeVisible()
  })

  test('completes a habit for today and updates the streak', async ({ page }) => {
    await signupAndLogin(page, `complete-habit-${Date.now()}@example.com`)

    await page.getByTestId('create-habit-button').click()
    await page.getByTestId('habit-name-input').fill('Read Books')
    await page.getByTestId('habit-save-button').click()
    await expect(page.getByTestId('habit-card-read-books')).toBeVisible()

    const streakEl = page.getByTestId('habit-streak-read-books')
    await expect(streakEl).toContainText('0')

    await page.getByTestId('habit-complete-read-books').click()

    await expect(streakEl).toContainText('1')
  })

  test('persists session and habits after page reload', async ({ page }) => {
    const email = `persist-${Date.now()}@example.com`
    await signupAndLogin(page, email)

    await page.getByTestId('create-habit-button').click()
    await page.getByTestId('habit-name-input').fill('Morning Run')
    await page.getByTestId('habit-save-button').click()
    await expect(page.getByTestId('habit-card-morning-run')).toBeVisible()

    await page.reload()
    await page.waitForURL('**/dashboard', { timeout: 10000 })

    await expect(page.getByTestId('dashboard-page')).toBeVisible()
    await expect(page.getByTestId('habit-card-morning-run')).toBeVisible()
  })

  test('logs out and redirects to /login', async ({ page }) => {
    await signupAndLogin(page, `logout-${Date.now()}@example.com`)

    await expect(page.getByTestId('dashboard-page')).toBeVisible()
    await page.getByTestId('auth-logout-button').click()

    await page.waitForURL('**/login', { timeout: 5000 })
    expect(page.url()).toContain('/login')

    const session = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('habit-tracker-session') ?? 'null')
    )
    expect(session).toBeNull()
  })

  test('loads the cached app shell when offline after the app has been loaded once', async ({ page, context }) => {
    await page.goto('/')
    await page.waitForURL('**/login', { timeout: 5000 })
    await page.goto('/login')
    await expect(page.locator('body')).toBeVisible()

    await page.waitForTimeout(2000)

    await context.setOffline(true)

    await page.goto('/login')

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('h1')).toBeVisible()
  })
})
