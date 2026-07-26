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

async function waitForAnimationFrame(page: Page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve(undefined))))
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

  const sidebar = page.getByTestId('home-sidebar')
  await expect(sidebar).toHaveCSS('padding-left', '32px')
  await expect(sidebar).toHaveCSS('padding-bottom', '0px')
  await expect(sidebar).toHaveCSS('gap', '20px')

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

test('Tweakpane controls update the dock configuration', async ({ page }) => {
  await page.goto('/')
  await waitForDockUpgrade(page, 'dock-wrapper')

  const sizeControl = page.locator('.tp-lblv').filter({
    has: page.locator('.tp-lblv_l', { hasText: /^size$/ }),
  }).locator('input')

  await expect(sizeControl).toHaveValue('40')
  await sizeControl.fill('72')
  await sizeControl.press('Enter')

  await expect(page.locator('dock-item').first()).toHaveAttribute('size', '72')
})

test('dock hover responds to accumulated one-pixel pointer movements', async ({ page }) => {
  await page.goto('/')
  await waitForDockUpgrade(page, 'dock-wrapper')

  const firstDockItem = page.locator('dock-item').first()
  const scales = await firstDockItem.evaluate(async (element) => {
    const dock = element.closest('dock-wrapper')
    const rect = element.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const startX = centerX + 20
    const startY = rect.top + rect.height / 2
    const move = (clientX: number) => dock?.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      clientX,
      clientY: startY,
      composed: true,
    }))

    move(centerX - 20)
    move(startX)
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
    const before = (element as HTMLElement & { scale: number }).scale
    for (let offset = 1; offset <= 4; offset++)
      move(startX + offset)
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))

    return {
      after: (element as HTMLElement & { scale: number }).scale,
      before,
    }
  })

  expect(scales.after).not.toBe(scales.before)
})

test('dock hover cancels queued work when the pointer leaves', async ({ page }) => {
  await page.goto('/')
  await waitForDockUpgrade(page, 'dock-wrapper')

  const scales = await page.locator('dock-wrapper').evaluate(async (dock) => {
    const item = dock.querySelector('dock-item')
    if (!item)
      return []

    const rect = item.getBoundingClientRect()
    dock.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      composed: true,
    }))
    dock.dispatchEvent(new MouseEvent('mouseleave'))

    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)))
    return Array.from(dock.querySelectorAll('dock-item'))
      .map(element => (element as HTMLElement & { scale: number }).scale)
  })

  expect(scales.length).toBeGreaterThan(0)
  expect(scales.every(scale => scale === 1)).toBe(true)
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
    x: startX + 40,
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
  await waitForAnimationFrame(page)

  const preview = page.locator('[data-dock-preview]')
  await expect(preview).toBeVisible()
  await expect(firstDockItem).toBeVisible()

  const previewStyle = await preview.evaluate((element) => {
    if (!(element instanceof HTMLElement))
      return null

    const transform = new DOMMatrixReadOnly(element.style.transform)
    return {
      translateX: transform.m41,
      translateY: transform.m42,
      transformOrigin: element.style.transformOrigin,
    }
  })

  const sourceBox = await firstDockItem.boundingBox()
  const previewBox = await preview.boundingBox()
  if (!sourceBox || !previewBox || !previewStyle)
    throw new Error('Missing drag source or preview box')

  expect(Math.abs(previewStyle.translateX - (dragPoint.x - pointerOffset.x))).toBeLessThan(8)
  expect(Math.abs(previewStyle.translateY - (dragPoint.y - pointerOffset.y))).toBeLessThan(8)
  expect(Math.abs(Number.parseFloat(previewStyle.transformOrigin) - pointerOffset.x)).toBeLessThan(5)
  expect(Math.abs(Number.parseFloat(previewStyle.transformOrigin.split(' ')[1]) - pointerOffset.y)).toBeLessThan(5)
  expect(Math.abs(previewBox.x - sourceBox.x)).toBeGreaterThan(8)
  expect(Math.abs(previewBox.y - sourceBox.y)).toBeGreaterThan(4)

  await page.mouse.move(movedPoint.x, movedPoint.y, { steps: 8 })
  await waitForAnimationFrame(page)

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
    await waitForAnimationFrame(page)

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

test('macOS dock opens a mock window and completes a minimize-restore round trip', async ({ page }) => {
  await page.goto('/?style=macos')
  await waitForDockUpgrade(page, 'dock-wrapper')
  await page.waitForFunction(() => {
    const area = document.querySelector('dock-minimize-area')
    return !!customElements.get('dock-minimize-area') && !!area?.shadowRoot
  })

  const mailIcon = page.locator('[data-app-id="mail"]')
  const minimizedWindowSeparator = page.getByTestId('macos-window-separator')
  await expect(minimizedWindowSeparator).toHaveCount(0)
  await expect(mailIcon).toBeVisible()
  await mailIcon.click()

  const mailWindow = page.locator('[data-testid="mock-window-mail"]')
  await expect(mailWindow).toBeVisible()
  await expect(mailWindow.getByText('Dock motion review', { exact: true }).first()).toBeVisible()

  const mailDockItem = page.locator('dock-item', { has: mailIcon })
  const mailIndicator = page.locator('[data-running-indicator="mail"]')
  await expect(mailIndicator).toBeVisible()
  await page.mouse.move(20, 20)
  await expect.poll(async () => {
    return mailDockItem.evaluate(
      element => (element as HTMLElement & { scale: number }).scale,
    )
  }).toBeCloseTo(1, 2)
  const indicatorBoxBeforeHover = await mailIndicator.boundingBox()
  if (!indicatorBoxBeforeHover)
    throw new Error('Missing Mail running indicator geometry')

  await mailIcon.hover()
  await expect.poll(async () => {
    return mailDockItem.evaluate(
      element => (element as HTMLElement & { scale: number }).scale,
    )
  }).toBeGreaterThan(1.2)
  const [indicatorBoxAfterHover, mailDockItemBox] = await Promise.all([
    mailIndicator.boundingBox(),
    mailDockItem.boundingBox(),
  ])
  if (!indicatorBoxAfterHover || !mailDockItemBox)
    throw new Error('Missing enlarged Mail Dock geometry')

  for (const indicatorBox of [indicatorBoxBeforeHover, indicatorBoxAfterHover]) {
    expect(indicatorBox.width).toBe(4)
    expect(indicatorBox.height).toBe(4)
  }
  expect(
    Math.abs(
      indicatorBoxAfterHover.x + indicatorBoxAfterHover.width / 2
      - (mailDockItemBox.x + mailDockItemBox.width / 2),
    ),
  ).toBeLessThanOrEqual(1)

  const trafficLights = mailWindow.locator('.traffic-lights')
  await trafficLights.hover()
  const trafficLightIconMetrics = await trafficLights.locator('.traffic-light-symbol')
    .evaluateAll(elements => elements.map((element) => {
      const icon = element as SVGElement
      const button = icon.closest('.traffic-light')
      if (!button)
        throw new Error('Missing traffic-light button')

      const buttonRect = button.getBoundingClientRect()
      const iconRect = icon.getBoundingClientRect()
      const style = getComputedStyle(icon)
      return {
        centerXDelta: Math.abs(
          iconRect.left + iconRect.width / 2
          - (buttonRect.left + buttonRect.width / 2),
        ),
        centerYDelta: Math.abs(
          iconRect.top + iconRect.height / 2
          - (buttonRect.top + buttonRect.height / 2),
        ),
        height: iconRect.height,
        opacity: Number.parseFloat(style.opacity),
        strokeWidth: Number.parseFloat(style.strokeWidth),
        width: iconRect.width,
      }
    }))
  expect(trafficLightIconMetrics).toHaveLength(3)
  for (const metric of trafficLightIconMetrics) {
    expect(metric.width).toBe(8)
    expect(metric.height).toBe(8)
    expect(metric.centerXDelta).toBeLessThanOrEqual(0.1)
    expect(metric.centerYDelta).toBeLessThanOrEqual(0.1)
    expect(metric.strokeWidth).toBe(1.25)
    expect(metric.opacity).toBe(0.72)
  }

  const windowBeforeDrag = await mailWindow.boundingBox()
  const titlebar = mailWindow.locator('.titlebar')
  const titlebarBox = await titlebar.boundingBox()
  if (!windowBeforeDrag || !titlebarBox)
    throw new Error('Missing Mail window geometry')

  const dragStart = {
    x: titlebarBox.x + titlebarBox.width * 0.55,
    y: titlebarBox.y + titlebarBox.height / 2,
  }
  await page.mouse.move(dragStart.x, dragStart.y)
  await page.mouse.down()
  await page.mouse.move(dragStart.x + 72, dragStart.y + 34, { steps: 12 })
  await page.mouse.up()

  await expect.poll(async () => {
    const current = await mailWindow.boundingBox()
    return current ? Math.round(current.x - windowBeforeDrag.x) : 0
  }).toBeGreaterThan(40)

  const minimizeButton = mailWindow.getByRole('button', { name: 'Minimize window' })
  await minimizeButton.hover()
  await minimizeButton.focus()
  await minimizeButton.press('Enter')

  await expect(mailIcon).toHaveAttribute('data-window-state', 'minimized')
  await expect(mailWindow).toBeHidden()
  await expect(minimizedWindowSeparator).toHaveCount(1)
  await expect(page.locator('dock-minimize-area dock-item[data-dock-minimized-window="mail"]')).toHaveCount(1)
  await expect(page.locator('[data-dock-genie-overlay]')).toHaveCount(0)
  const restoreButton = page.getByRole('button', { name: 'Restore Mail' })
  await expect(restoreButton).toBeFocused()
  await expect(restoreButton).toHaveCSS('cursor', 'default')

  const minimizedItem = page.locator(
    'dock-minimize-area dock-item[data-dock-minimized-window="mail"]',
  )
  const minimizedThumbnail = minimizedItem.locator('[part="thumbnail"]')
  await expect(minimizedItem).toHaveCSS('cursor', 'default')
  await expect(minimizedThumbnail).toHaveCSS('cursor', 'default')
  const regularItem = page.locator('dock-wrapper > dock-item').first()
  const [minimizedItemBox, minimizedThumbnailBox, regularItemBox] = await Promise.all([
    minimizedItem.boundingBox(),
    minimizedThumbnail.boundingBox(),
    regularItem.boundingBox(),
  ])
  if (!minimizedItemBox || !minimizedThumbnailBox || !regularItemBox)
    throw new Error('Missing Dock item geometry')

  expect(Math.abs(minimizedItemBox.height - regularItemBox.height))
    .toBeLessThanOrEqual(1)
  expect(
    Math.abs(
      minimizedThumbnailBox.y + minimizedThumbnailBox.height / 2
      - (regularItemBox.y + regularItemBox.height / 2),
    ),
  ).toBeLessThanOrEqual(1)

  const scaleBeforeHover = await minimizedItem.evaluate(
    element => (element as HTMLElement & { scale: number }).scale,
  )
  await minimizedItem.hover()
  await expect.poll(async () => {
    return minimizedItem.evaluate(
      element => (element as HTMLElement & { scale: number }).scale,
    )
  }).toBeGreaterThan(scaleBeforeHover)

  await restoreButton.press('Enter')

  await expect(mailIcon).toHaveAttribute('data-window-state', 'idle')
  await expect(mailWindow).toBeVisible()
  await expect(minimizedWindowSeparator).toHaveCount(0)
  await expect(minimizeButton).toBeFocused()
  await expect(page.locator('dock-minimize-area dock-item[data-dock-minimized-window="mail"]')).toHaveCount(0)
  await expect(page.locator('[data-dock-genie-overlay]')).toHaveCount(0)
  await expect(mailWindow).not.toHaveAttribute('aria-hidden', 'true')
  await expect(mailWindow).not.toHaveAttribute('inert', '')
  await expect.poll(async () => {
    return mailWindow.evaluate(element => ({
      pointerEvents: (element as HTMLElement).style.pointerEvents,
      visibility: (element as HTMLElement).style.visibility,
    }))
  }).toEqual({
    pointerEvents: '',
    visibility: '',
  })
})

test('all macOS dock icons open their own closable mock window', async ({ page }) => {
  const appIds = [
    'files',
    'app-store',
    'freeform',
    'keynote',
    'mail',
    'messages',
    'mindfulness',
    'music',
    'tv',
    'lofi',
    'appearance',
  ]

  await page.goto('/?style=macos')
  await waitForDockUpgrade(page, 'dock-wrapper')
  await page.waitForFunction(() => !!customElements.get('dock-minimize-area'))
  await expect(page.locator('[data-app-id]')).toHaveCount(appIds.length)

  for (const appId of appIds) {
    await page.locator(`[data-app-id="${appId}"]`).click()
    const mockWindow = page.locator(`[data-testid="mock-window-${appId}"]`)
    await expect(mockWindow).toBeVisible()
    await mockWindow.getByRole('button', { name: 'Close window' }).click()
    await expect(mockWindow).toHaveCount(0)
  }
})

test('macOS minimized thumbnails can be sorted within their own area', async ({ page }) => {
  await page.goto('/?style=macos')
  await waitForDockUpgrade(page, 'dock-wrapper')
  await page.waitForFunction(() => {
    const area = document.querySelector('dock-minimize-area')
    return !!customElements.get('dock-minimize-area') && !!area?.shadowRoot
  })

  await page.locator('dock-wrapper').evaluate((element) => {
    element.setAttribute('sortable', 'true')
    element.setAttribute('max-scale', '1')
    element.addEventListener('on-sort', () => {
      const dock = element as HTMLElement
      dock.dataset.providerSortEvents = String(
        Number(dock.dataset.providerSortEvents ?? 0) + 1,
      )
    })
  })

  const appIds = ['mail', 'messages', 'music']
  for (const appId of appIds) {
    await page.locator(`[data-app-id="${appId}"]`).click()
    const mockWindow = page.locator(`[data-testid="mock-window-${appId}"]`)
    await expect(mockWindow).toBeVisible()
    await mockWindow.getByRole('button', { name: 'Minimize window' }).click()
    await expect(page.locator(`[data-app-id="${appId}"]`))
      .toHaveAttribute('data-window-state', 'minimized')
    await expect(mockWindow).toBeHidden()
  }

  const thumbnails = page.locator(
    'dock-minimize-area dock-item[data-dock-minimized-window]',
  )
  await expect(thumbnails).toHaveCount(3)
  await expect.poll(async () => {
    return thumbnails.evaluateAll(items => items.map(
      item => item.getAttribute('data-dock-minimized-window'),
    ))
  }).toEqual(appIds)

  const lastBox = await thumbnails.last().boundingBox()
  if (!lastBox)
    throw new Error('Missing minimized thumbnail geometry')

  await dragLocatorTo(
    page,
    'dock-minimize-area dock-item[data-dock-minimized-window="mail"]',
    {
      x: lastBox.x + lastBox.width * 0.75,
      y: lastBox.y + lastBox.height / 2,
    },
  )

  await expect.poll(async () => {
    return thumbnails.evaluateAll(items => items.map(
      item => item.getAttribute('data-dock-minimized-window'),
    ))
  }).toEqual(['messages', 'music', 'mail'])
  await expect(page.locator('dock-wrapper')).not.toHaveAttribute('data-provider-sort-events')

  for (const appId of appIds) {
    await expect(page.locator(`[data-testid="mock-window-${appId}"]`)).toBeHidden()
    await expect(page.locator(`[data-app-id="${appId}"]`))
      .toHaveAttribute('data-window-state', 'minimized')
  }
})

test('dock minimize keeps animating with an asynchronous visibility adapter', async ({ page }) => {
  await page.goto('/?style=macos')
  await waitForDockUpgrade(page, 'dock-wrapper')
  await page.waitForFunction(() => !!customElements.get('dock-minimize-area'))

  await page.evaluate(() => {
    const source = document.createElement('section')
    source.id = 'async-visibility-window'
    source.textContent = 'Asynchronous visibility adapter'
    Object.assign(source.style, {
      alignItems: 'center',
      background: 'linear-gradient(135deg, #60a5fa, #7c3aed)',
      borderRadius: '18px',
      color: 'white',
      display: 'flex',
      font: '600 20px system-ui',
      height: '180px',
      justifyContent: 'center',
      left: '120px',
      position: 'fixed',
      top: '100px',
      width: '320px',
      zIndex: '100',
    })
    document.body.appendChild(source)

    const area = document.querySelector('dock-minimize-area') as HTMLElement & {
      registerWindow: (options: {
        id: string
        label: string
        source: HTMLElement
        visibility: {
          setHidden: (hidden: boolean) => Promise<void>
        }
      }) => {
        minimize: () => Promise<void>
        state: string
      }
    }
    const handle = area.registerWindow({
      id: 'async-visibility',
      label: 'Async visibility',
      source,
      visibility: {
        setHidden: async (hidden) => {
          await new Promise(resolve => window.setTimeout(resolve, 80))
          source.style.visibility = hidden ? 'hidden' : ''
          source.style.pointerEvents = hidden ? 'none' : ''
        },
      },
    })
    void handle.minimize().catch((error: unknown) => {
      source.dataset.error = String(error)
    })
  })

  await expect(page.locator('[data-dock-genie-overlay]')).toHaveCount(1)
  await expect.poll(async () => {
    return page.locator('dock-minimize-area').evaluate((element) => {
      const area = element as HTMLElement & {
        getWindow: (id: string) => { state: string } | undefined
      }
      return area.getWindow('async-visibility')?.state
    })
  }).toBe('minimized')
  await expect(page.locator('#async-visibility-window')).toBeHidden()
  await expect(page.locator('#async-visibility-window')).not.toHaveAttribute('data-error')

  await page.locator('dock-minimize-area').evaluate(async (element) => {
    const area = element as HTMLElement & {
      restore: (id: string) => Promise<void>
    }
    await area.restore('async-visibility')
  })

  await expect(page.locator('#async-visibility-window')).toBeVisible()
  await expect(page.locator('[data-dock-genie-overlay]')).toHaveCount(0)
  await page.locator('dock-minimize-area').evaluate(async (element) => {
    const area = element as HTMLElement & {
      unregisterWindow: (id: string) => Promise<boolean>
    }
    await area.unregisterWindow('async-visibility')
  })
  await page.locator('#async-visibility-window').evaluate(element => element.remove())
})

test('genie animation renders and restores from every dock position', async ({ page }) => {
  const positions = ['top', 'right', 'bottom', 'left'] as const

  await page.goto('/?style=macos')
  await waitForDockUpgrade(page, 'dock-wrapper')
  await page.waitForFunction(() => !!customElements.get('dock-minimize-area'))

  for (const position of positions) {
    const sourceCenter = await page.evaluate((dockPosition) => {
      document.querySelector('#position-fixture')?.remove()
      document.querySelector('#position-source')?.remove()

      const fixture = document.createElement('div')
      fixture.id = 'position-fixture'
      Object.assign(fixture.style, {
        position: 'fixed',
        zIndex: '4000',
      })
      const edgeStyles: Record<typeof dockPosition, Partial<CSSStyleDeclaration>> = {
        bottom: {
          bottom: '18px',
          left: '50%',
          transform: 'translateX(-50%)',
        },
        left: {
          left: '18px',
          top: '50%',
          transform: 'translateY(-50%)',
        },
        right: {
          right: '18px',
          top: '50%',
          transform: 'translateY(-50%)',
        },
        top: {
          left: '50%',
          top: '18px',
          transform: 'translateX(-50%)',
        },
      }
      Object.assign(fixture.style, edgeStyles[dockPosition])

      const dock = document.createElement('dock-wrapper')
      dock.setAttribute('position', dockPosition)
      dock.setAttribute(
        'direction',
        dockPosition === 'top' || dockPosition === 'bottom' ? 'horizontal' : 'vertical',
      )
      dock.setAttribute('gap', '8')
      dock.setAttribute('max-scale', '1')
      dock.setAttribute('padding', '8')
      dock.setAttribute('size', '48')
      Object.assign(dock.style, {
        background: 'rgba(30, 41, 59, 0.78)',
        borderRadius: '14px',
      })

      const anchor = document.createElement('dock-item')
      const anchorContent = document.createElement('span')
      Object.assign(anchorContent.style, {
        background: '#f8fafc',
        borderRadius: '10px',
        display: 'block',
      })
      anchor.appendChild(anchorContent)
      const separator = document.createElement('dock-separator')
      const area = document.createElement('dock-minimize-area')
      area.id = 'position-area'
      dock.append(anchor, separator, area)
      fixture.appendChild(dock)

      const source = document.createElement('section')
      source.id = 'position-source'
      source.textContent = `${dockPosition} Genie`
      Object.assign(source.style, {
        alignItems: 'center',
        background: 'linear-gradient(135deg, #fb7185, #7c3aed)',
        borderRadius: '20px',
        color: 'white',
        display: 'flex',
        font: '700 22px system-ui',
        height: '160px',
        justifyContent: 'center',
        left: 'calc(50% - 140px)',
        position: 'fixed',
        top: 'calc(50% - 80px)',
        width: '280px',
        zIndex: '3000',
      })
      document.body.append(fixture, source)

      const typedArea = area as HTMLElement & {
        registerWindow: (options: {
          id: string
          label: string
          source: HTMLElement
        }) => {
          minimize: () => Promise<void>
        }
      }
      const handle = typedArea.registerWindow({
        id: `position-${dockPosition}`,
        label: `${dockPosition} window`,
        source,
      })
      void handle.minimize().catch((error: unknown) => {
        source.dataset.error = String(error)
      })

      const rect = source.getBoundingClientRect()
      return {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
      }
    }, position)

    const overlay = page.locator('[data-dock-genie-overlay]')
    await expect(overlay).toHaveCount(1)
    await expect.poll(async () => {
      return overlay.evaluate((element, point) => {
        const canvas = element as HTMLCanvasElement
        const context = canvas.getContext('2d')
        if (!context)
          return 0

        const scaleX = canvas.width / window.innerWidth
        const scaleY = canvas.height / window.innerHeight
        return context.getImageData(
          Math.min(canvas.width - 1, Math.round(point.x * scaleX)),
          Math.min(canvas.height - 1, Math.round(point.y * scaleY)),
          1,
          1,
        ).data[3]
      }, sourceCenter)
    }).toBeGreaterThan(0)

    await expect.poll(async () => {
      return page.locator('#position-area').evaluate((element, id) => {
        const area = element as HTMLElement & {
          getWindow: (windowId: string) => { state: string } | undefined
        }
        return area.getWindow(id)?.state
      }, `position-${position}`)
    }).toBe('minimized')
    await expect(page.locator('#position-source')).toBeHidden()
    await expect(page.locator('#position-source')).not.toHaveAttribute('data-error')

    const alignment = await page.locator('#position-fixture').evaluate(
      (fixture, dockPosition) => {
        const anchor = fixture.querySelector('dock-item')
        const area = fixture.querySelector('dock-minimize-area')
        const minimizedItem = area?.shadowRoot?.querySelector('dock-item')
        const thumbnail = minimizedItem?.querySelector('[part="thumbnail"]')
        if (!anchor || !minimizedItem || !thumbnail)
          throw new Error('Missing position fixture Dock geometry')

        const anchorRect = anchor.getBoundingClientRect()
        const minimizedItemRect = minimizedItem.getBoundingClientRect()
        const thumbnailRect = thumbnail.getBoundingClientRect()
        const horizontal = dockPosition === 'top' || dockPosition === 'bottom'
        return {
          centerDelta: horizontal
            ? Math.abs(
                thumbnailRect.top + thumbnailRect.height / 2
                - (anchorRect.top + anchorRect.height / 2),
              )
            : Math.abs(
                thumbnailRect.left + thumbnailRect.width / 2
                - (anchorRect.left + anchorRect.width / 2),
              ),
          footprintDelta: horizontal
            ? Math.abs(minimizedItemRect.height - anchorRect.height)
            : Math.abs(minimizedItemRect.width - anchorRect.width),
        }
      },
      position,
    )
    expect(alignment.centerDelta).toBeLessThanOrEqual(1)
    expect(alignment.footprintDelta).toBeLessThanOrEqual(1)

    await page.locator('#position-area').evaluate(async (element, id) => {
      const area = element as HTMLElement & {
        restore: (windowId: string) => Promise<void>
        unregisterWindow: (windowId: string) => Promise<boolean>
      }
      await area.restore(id)
      await area.unregisterWindow(id)
    }, `position-${position}`)
    await expect(page.locator('#position-source')).toBeVisible()
    await expect(overlay).toHaveCount(0)
  }

  await page.locator('#position-fixture').evaluate(element => element.remove())
  await page.locator('#position-source').evaluate(element => element.remove())
})
