import { expect, test } from '@playwright/test'

test('playground renders dock and hover expands an item', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('h1', { hasText: 'Dockbar' })).toBeVisible()
  await expect(page.locator('dock-wrapper')).toBeVisible()

  const firstDockItem = page.locator('dock-item').first()
  await expect(firstDockItem).toBeVisible()

  const getRenderedWidth = () =>
    firstDockItem.evaluate((element) => {
      const item = element.shadowRoot?.querySelector('li')
      return item?.getBoundingClientRect().width ?? 0
    })

  const beforeHover = await getRenderedWidth()
  await firstDockItem.hover()
  await page.waitForTimeout(250)
  const afterHover = await getRenderedWidth()

  expect(beforeHover).toBeGreaterThan(0)
  expect(afterHover).toBeGreaterThan(beforeHover)
})
