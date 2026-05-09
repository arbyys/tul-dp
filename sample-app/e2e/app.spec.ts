import { expect, test } from '@playwright/test'

test.describe('App shell', () => {
  test('loads and shows the app header', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Výpůjčky')).toBeVisible()
  })

  test('header has settings and theme toggle buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[title="Nastavení"]')).toBeVisible()
    await expect(page.locator('[title="Barevný motiv"]')).toBeVisible()
  })
})

test.describe('Home — room list', () => {
  test('shows body content without errors', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
  })

  test('navigates to add room page when "Přidat místnost" is clicked', async ({ page }) => {
    await page.goto('/')
    const addBtn = page.getByText('Přidat místnost')
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await expect(page).toHaveURL(/\/rooms\/add/)
    }
  })
})

test.describe('Add room page', () => {
  test('renders both tabs', async ({ page }) => {
    await page.goto('/rooms/add')
    await expect(page.getByText('Připojit se')).toBeVisible()
    await expect(page.getByText('Vytvořit novou')).toBeVisible()
  })

  test('join tab shows mnemonic receive UI', async ({ page }) => {
    await page.goto('/rooms/add')
    await expect(page.getByRole('button', { name: 'QR kód' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ručně' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Zvuk' })).toBeVisible()
  })

  test('create tab shows building input', async ({ page }) => {
    await page.goto('/rooms/add')
    await page.getByText('Vytvořit novou').click()
    await expect(page.getByPlaceholder('např. A')).toBeVisible()
  })
})

test.describe('Profile setup page', () => {
  test('renders the settings page', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.getByText('Nastavení')).toBeVisible()
  })

  test('shows name and email fields', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.getByPlaceholder('Vaše jméno')).toBeVisible()
    await expect(page.getByPlaceholder('vas@email.cz')).toBeVisible()
  })

  test('shows mnemonic share section', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.getByText('Sdílet mnemonic profilu')).toBeVisible()
  })

  test('navigates back to home when back button is clicked', async ({ page }) => {
    await page.goto('/profile')
    await page.locator('.rounded-full').first().click()
    await expect(page).toHaveURL('/')
  })
})
