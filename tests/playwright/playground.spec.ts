import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function dragLocatorTo(page: Page, selector: string, target: { x: number; y: number }) {
  const box = await page.locator(selector).boundingBox()
  if (!box)
    throw new Error(`Missing bounding box for ${selector}`)

  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + 12, startY, { steps: 4 })
  await page.mouse.move(target.x, target.y, { steps: 20 })
  await page.mouse.up()
}

async function waitForDockUpgrade(page: Page, selector: string) {
  await page.waitForFunction((dockSelector) => {
    const dock = document.querySelector<HTMLElement>(dockSelector)
    return !!customElements.get('dock-wrapper')
      && !!customElements.get('dock-item')
      && !!dock?.shadowRoot
  }, selector)
}

test('playground renders dock and hover expands an item', async ({ page }) => {
  await page.goto('/')
  await waitForDockUpgrade(page, 'dock-wrapper')

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

test('sortable dock reorders items when dragging across the dock', async ({ page }) => {
  await page.goto('/sortable')
  await waitForDockUpgrade(page, '#sortable-dock')

  await expect(page.locator('#sortable-order')).toHaveText('1,2,3,4,5')

  const lastItemBox = await page.locator('#sortable-dock dock-item').last().boundingBox()
  if (!lastItemBox)
    throw new Error('Missing last dock item')

  await dragLocatorTo(page, '#sortable-dock dock-item:first-of-type', {
    x: lastItemBox.x + lastItemBox.width + 36,
    y: lastItemBox.y + lastItemBox.height / 2,
  })

  await expect(page.locator('#sortable-order')).toHaveText('2,3,4,5,1')
})

test('sortable dock deletes an item when dropped outside', async ({ page }) => {
  await page.goto('/sortable')
  await waitForDockUpgrade(page, '#sortable-dock')

  await expect(page.locator('#sortable-order')).toHaveText('1,2,3,4,5')

  const dockBox = await page.locator('#sortable-dock').boundingBox()
  if (!dockBox)
    throw new Error('Missing dock wrapper')

  await dragLocatorTo(page, '#sortable-dock dock-item:first-of-type', {
    x: dockBox.x + dockBox.width / 2,
    y: dockBox.y + dockBox.height + 180,
  })

  await expect(page.locator('#sortable-order')).toHaveText('2,3,4,5')
  await expect(page.locator('#sortable-deleted')).toHaveText('1')
})
