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

async function getDockItemWidths(page: Page, selector: string) {
  return page.locator(`${selector} dock-item`).evaluateAll((items) => {
    return items.map((element) => {
      const item = element.shadowRoot?.querySelector('li')
      return Math.round(item?.getBoundingClientRect().width ?? 0)
    })
  })
}

async function getDockItemBaseWidths(page: Page, selector: string) {
  return page.locator(`${selector} dock-item`).evaluateAll((items) => {
    return items.map((element) => {
      const dockItem = element as HTMLElement & { size?: number; width?: number }
      const width = Number(dockItem.width)
      if (Number.isFinite(width) && width > 0)
        return width

      return Number(dockItem.size ?? element.getAttribute('size') ?? 0)
    })
  })
}

async function createSeparatorDock(page: Page) {
  await page.evaluate(() => {
    const existing = document.querySelector('#separator-dock-fixture')
    existing?.remove()

    const fixture = document.createElement('div')
    fixture.id = 'separator-dock-fixture'
    Object.assign(fixture.style, {
      alignItems: 'center',
      display: 'flex',
      inset: '0',
      justifyContent: 'center',
      pointerEvents: 'none',
      position: 'fixed',
      zIndex: '100',
    })

    const dock = document.createElement('dock-wrapper')
    dock.id = 'separator-dock'
    dock.setAttribute('sortable', '')
    dock.setAttribute('size', '56')
    dock.setAttribute('padding', '10')
    dock.setAttribute('gap', '10')
    dock.setAttribute('max-scale', '1')
    dock.setAttribute('max-range', '1')
    Object.assign(dock.style, {
      background: 'rgba(255, 255, 255, 0.14)',
      border: '1px solid rgba(255, 255, 255, 0.24)',
      borderRadius: '24px',
      pointerEvents: 'auto',
    })

    const order = document.createElement('output')
    order.id = 'separator-dock-order'
    order.textContent = 'a,b,c,d,e'

    const updateOrder = () => {
      order.textContent = Array.from(dock.querySelectorAll('dock-item'))
        .map(item => (item as HTMLElement).dataset.value)
        .join(',')
    }

    dock.addEventListener('on-sort', updateOrder)

    const appendItem = (value: string) => {
      const item = document.createElement('dock-item')
      item.dataset.value = value
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = value
      Object.assign(button.style, {
        background: 'white',
        border: '0',
        borderRadius: '18px',
        color: '#111827',
        height: '100%',
        width: '100%',
      })
      item.appendChild(button)
      dock.appendChild(item)
    }

    appendItem('a')
    appendItem('b')
    appendItem('c')

    const separator = document.createElement('dock-separator')
    separator.setAttribute('thickness', '2')
    dock.appendChild(separator)

    appendItem('d')
    appendItem('e')

    fixture.append(order, dock)
    document.body.appendChild(fixture)
  })

  await waitForDockUpgrade(page, '#separator-dock')
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

  expect(beforeHover).toBeGreaterThan(0)
  await expect.poll(getRenderedWidth).toBeGreaterThan(beforeHover)
})

test('dock item supports per-item custom width', async ({ page }) => {
  await page.goto('/custom-width')
  await waitForDockUpgrade(page, '#custom-width-static')

  await expect.poll(async () => {
    return getDockItemWidths(page, '#custom-width-static')
  }).toEqual([56, 96, 144, 72])

  const wideItem = page.locator('#custom-width-static dock-item').nth(2)
  const beforeHover = await wideItem.evaluate((element) => {
    const item = element.shadowRoot?.querySelector('li')
    return item?.getBoundingClientRect().width ?? 0
  })

  await wideItem.hover()
  await expect.poll(async () => {
    return wideItem.evaluate((element) => {
      const item = element.shadowRoot?.querySelector('li')
      return item?.getBoundingClientRect().width ?? 0
    })
  }).toBeGreaterThan(beforeHover)
})

test('custom width page updates reactive item width', async ({ page }) => {
  await page.goto('/custom-width')
  await waitForDockUpgrade(page, '#custom-width-reactive')

  await expect.poll(async () => {
    return getDockItemWidths(page, '#custom-width-reactive')
  }).toEqual([56, 84, 104])

  await page.locator('#custom-width-toggle').click()

  await expect.poll(async () => {
    return getDockItemWidths(page, '#custom-width-reactive')
  }).toEqual([56, 156, 104])
})

test('custom width sortable case preserves mixed item widths', async ({ page }) => {
  await page.goto('/custom-width')
  await waitForDockUpgrade(page, '#custom-width-sortable')

  await expect(page.locator('#custom-width-sortable-order')).toHaveText('a,b,c,d,e')
  await expect.poll(async () => {
    return getDockItemWidths(page, '#custom-width-sortable')
  }).toEqual([56, 112, 48, 136, 56])

  const lastItemBox = await page.locator('#custom-width-sortable dock-item').last().boundingBox()
  if (!lastItemBox)
    throw new Error('Missing last custom width dock item')

  await dragLocatorTo(page, '#custom-width-sortable dock-item:first-of-type', {
    x: lastItemBox.x + lastItemBox.width + 36,
    y: lastItemBox.y + lastItemBox.height / 2,
  })

  await expect(page.locator('#custom-width-sortable-order')).toHaveText('b,c,d,e,a')
  await expect.poll(async () => {
    return getDockItemBaseWidths(page, '#custom-width-sortable')
  }).toEqual([112, 48, 136, 56, 56])
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

test('sortable dock keeps the source visible and moves a drag preview', async ({ page }) => {
  await page.goto('/sortable')
  await waitForDockUpgrade(page, '#sortable-dock')

  const firstDockItem = page.locator('#sortable-dock dock-item').first()
  const box = await firstDockItem.boundingBox()
  if (!box)
    throw new Error('Missing first dock item')

  const requestedOffset = {
    x: Math.round(box.width * 0.28),
    y: Math.round(box.height * 0.73),
  }
  const startX = box.x + requestedOffset.x
  const startY = box.y + requestedOffset.y
  const dragPoint = {
    x: startX + 24,
    y: startY - 8,
  }
  const movedPoint = {
    x: startX + 96,
    y: startY - 8,
  }

  await page.mouse.move(startX, startY)
  await expect.poll(async () => {
    const hovered = await firstDockItem.boundingBox()
    return hovered?.width ?? 0
  }).toBeGreaterThan(box.width)

  const hoveredBox = await firstDockItem.boundingBox()
  if (!hoveredBox)
    throw new Error('Missing hovered dock item')

  const pointerOffset = {
    x: startX - hoveredBox.x,
    y: startY - hoveredBox.y,
  }

  await page.mouse.down()
  await page.mouse.move(dragPoint.x, dragPoint.y, { steps: 6 })

  const preview = page.locator('[data-dock-preview]')
  await expect(preview).toBeVisible()
  await expect(firstDockItem).toBeVisible()

  const previewStyle = await preview.evaluate((element) => {
    if (!(element instanceof HTMLElement))
      return null

    return {
      left: element.style.left,
      top: element.style.top,
      transformOrigin: element.style.transformOrigin,
    }
  })

  const sourceBox = await firstDockItem.boundingBox()
  const previewBox = await preview.boundingBox()
  if (!sourceBox || !previewBox || !previewStyle)
    throw new Error('Missing drag source or preview box')

  expect(Math.abs(Number.parseFloat(previewStyle.left) - (dragPoint.x - pointerOffset.x))).toBeLessThan(8)
  expect(Math.abs(Number.parseFloat(previewStyle.top) - (dragPoint.y - pointerOffset.y))).toBeLessThan(8)
  expect(Math.abs(Number.parseFloat(previewStyle.transformOrigin) - pointerOffset.x)).toBeLessThan(4)
  expect(Math.abs(Number.parseFloat(previewStyle.transformOrigin.split(' ')[1]) - pointerOffset.y)).toBeLessThan(4)
  expect(Math.abs(previewBox.x - sourceBox.x)).toBeGreaterThan(8)
  expect(Math.abs(previewBox.y - sourceBox.y)).toBeGreaterThan(4)

  await page.mouse.move(movedPoint.x, movedPoint.y, { steps: 8 })

  const movedPreviewBox = await preview.boundingBox()
  if (!movedPreviewBox)
    throw new Error('Missing moved drag preview box')

  expect(movedPreviewBox.x).toBeGreaterThan(previewBox.x + 40)

  await page.mouse.up()
  await expect(preview).toHaveCount(0)
})

for (const [label, grabRatio] of [
  ['center grab', 0.5],
  ['right-edge grab', 0.86],
] as const) {
  test(`sortable dock clamps drag preview at separator boundaries with ${label}`, async ({ page }) => {
    await page.goto('/sortable')
    await waitForDockUpgrade(page, '#sortable-dock')
    await createSeparatorDock(page)

    const source = page.locator('#separator-dock dock-item[data-value="c"]')
    const separator = page.locator('#separator-dock dock-separator')
    const sourceBox = await source.boundingBox()
    const separatorBox = await separator.boundingBox()
    if (!sourceBox || !separatorBox)
      throw new Error('Missing separator dock layout boxes')

    const startX = sourceBox.x + sourceBox.width * grabRatio
    const startY = sourceBox.y + sourceBox.height / 2
    const targetX = separatorBox.x - 2

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 12, startY, { steps: 4 })
    await page.mouse.move(targetX, startY, { steps: 8 })

    const preview = page.locator('[data-dock-preview]')
    await expect(preview).toBeVisible()

    const previewBox = await preview.boundingBox()
    if (!previewBox)
      throw new Error('Missing drag preview box')

    expect(previewBox.x + previewBox.width).toBeLessThanOrEqual(separatorBox.x + 1)

    await page.mouse.move(separatorBox.x + separatorBox.width + 40, startY, { steps: 8 })
    await page.mouse.up()

    await expect(preview).toHaveCount(0)
    await expect(page.locator('#separator-dock-order')).toHaveText('a,b,c,d,e')
  })
}

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
