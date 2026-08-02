const appDefinitions = [
  { id: 'files', label: 'Files' },
  { id: 'notes', label: 'Notes' },
  { id: 'music', label: 'Music' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'weather', label: 'Weather' },
]

const transitionStates = new Set(['minimizing', 'minimized', 'restoring'])
const area = document.querySelector('#preview-area')
const separator = document.querySelector('#preview-separator')
const releaseBadge = document.querySelector('#release-badge')
const handles = new Map()

let topZIndex = 20

Promise.all([
  customElements.whenDefined('dock-wrapper'),
  customElements.whenDefined('dock-item'),
  customElements.whenDefined('dock-minimize-area'),
]).then(initializeDemo).catch((error) => {
  console.error(error)
  releaseBadge.innerHTML = '<span class="release-light"></span>Failed to load dockbar'
  releaseBadge.style.color = '#a51d2d'
})

function initializeDemo() {
  for (const app of appDefinitions) {
    const windowElement = getWindow(app.id)
    const handle = area.registerWindow({
      id: app.id,
      label: app.label,
      source: () => getWindow(app.id),
    })

    handles.set(app.id, handle)
    installWindowControls(app.id, windowElement, handle)
    installWindowDragging(windowElement)
    installWindowResizing(windowElement, handle)
    syncRunningIndicator(app.id)
  }

  document.querySelectorAll('[data-app-id]').forEach((button) => {
    button.addEventListener('click', () => openOrRestore(button.dataset.appId))
  })

  area.addEventListener('on-window-state-change', (event) => {
    const { id, state } = event.detail
    syncSeparator()

    if (state === 'idle') {
      const windowElement = getWindow(id)
      windowElement.hidden = false
      bringToFront(windowElement)
    }
  })

  area.addEventListener('on-window-error', (event) => {
    console.error('Dock window error:', event.detail)
    releaseBadge.innerHTML = '<span class="release-light"></span>Animation fallback used'
  })

  syncSeparator()
  bringToFront(getWindow('notes'))
  scheduleAutoplay()
}

function installWindowControls(id, windowElement, handle) {
  const minimizeButton = windowElement.querySelector('[data-action="minimize"]')

  minimizeButton.addEventListener('pointerenter', () => {
    if (handle.state === 'idle' && !windowElement.hidden)
      handle.prepare()
  })

  minimizeButton.addEventListener('pointerleave', () => handle.cancelPrepare())

  minimizeButton.addEventListener('click', async (event) => {
    event.stopPropagation()
    if (handle.state !== 'idle' || windowElement.hidden)
      return

    try {
      await handle.minimize()
    }
    catch (error) {
      console.error(`Could not minimize ${id}:`, error)
    }
  })

  windowElement.querySelector('[data-action="close"]').addEventListener('click', (event) => {
    event.stopPropagation()
    if (handle.state !== 'idle')
      return

    windowElement.hidden = true
    syncRunningIndicator(id)
  })

  windowElement.querySelector('[data-action="zoom"]').addEventListener('click', (event) => {
    event.stopPropagation()
    if (handle.state !== 'idle')
      return

    windowElement.classList.toggle('maximized')
    handle.invalidatePreparedSnapshot()
    bringToFront(windowElement)
  })

  windowElement.addEventListener('pointerdown', () => bringToFront(windowElement))
}

function installWindowDragging(windowElement) {
  const titlebar = windowElement.querySelector('.titlebar')
  let drag = null

  titlebar.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('.traffic-lights'))
      return
    if (windowElement.classList.contains('maximized'))
      return

    const rect = windowElement.getBoundingClientRect()
    drag = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      pointerId: event.pointerId,
    }
    titlebar.setPointerCapture(event.pointerId)
    bringToFront(windowElement)
  })

  titlebar.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId)
      return

    const maxLeft = Math.max(8, window.innerWidth - windowElement.offsetWidth - 8)
    const maxTop = Math.max(8, window.innerHeight - windowElement.offsetHeight - 96)
    windowElement.style.left = `${clamp(event.clientX - drag.offsetX, 8, maxLeft)}px`
    windowElement.style.top = `${clamp(event.clientY - drag.offsetY, 8, maxTop)}px`
  })

  const finishDrag = (event) => {
    if (!drag || event.pointerId !== drag.pointerId)
      return
    drag = null
  }

  titlebar.addEventListener('pointerup', finishDrag)
  titlebar.addEventListener('pointercancel', finishDrag)
}

function installWindowResizing(windowElement, handle) {
  const resizeHandle = document.createElement('div')
  resizeHandle.className = 'resize-handle'
  resizeHandle.setAttribute('aria-hidden', 'true')
  windowElement.appendChild(resizeHandle)

  let resize = null

  resizeHandle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || windowElement.classList.contains('maximized'))
      return

    const rect = windowElement.getBoundingClientRect()
    resize = {
      height: rect.height,
      left: rect.left,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      top: rect.top,
      width: rect.width,
    }
    resizeHandle.setPointerCapture(event.pointerId)
    bringToFront(windowElement)
    event.preventDefault()
    event.stopPropagation()
  })

  resizeHandle.addEventListener('pointermove', (event) => {
    if (!resize || event.pointerId !== resize.pointerId)
      return

    const maxWidth = Math.max(330, window.innerWidth - resize.left - 8)
    const maxHeight = Math.max(220, window.innerHeight - resize.top - 96)
    windowElement.style.width = `${
      clamp(resize.width + event.clientX - resize.startX, 330, maxWidth)
    }px`
    windowElement.style.height = `${
      clamp(resize.height + event.clientY - resize.startY, 220, maxHeight)
    }px`
  })

  const finishResize = (event) => {
    if (!resize || event.pointerId !== resize.pointerId)
      return

    resize = null
    handle.invalidatePreparedSnapshot()
  }

  resizeHandle.addEventListener('pointerup', finishResize)
  resizeHandle.addEventListener('pointercancel', finishResize)
}

async function openOrRestore(id) {
  const handle = handles.get(id)
  const windowElement = getWindow(id)
  if (!handle || (transitionStates.has(handle.state) && handle.state !== 'minimized'))
    return

  try {
    if (handle.state === 'minimized')
      await handle.restore()
    else
      windowElement.hidden = false

    syncRunningIndicator(id)
    bringToFront(windowElement)
  }
  catch (error) {
    console.error(`Could not open ${id}:`, error)
  }
}

function scheduleAutoplay() {
  const start = () => {
    window.setTimeout(() => {
      void runAutoplay('terminal')
    }, 600)
  }

  if (document.readyState === 'complete')
    start()
  else
    window.addEventListener('load', start, { once: true })
}

async function runAutoplay(id) {
  const handle = handles.get(id)
  const windowElement = getWindow(id)
  if (!handle || !windowElement)
    return

  releaseBadge.innerHTML = '<span class="release-light"></span>Autoplay · opening Terminal'
  await openOrRestore(id)
  await wait(900)

  if (handle.state !== 'idle' || windowElement.hidden)
    return

  releaseBadge.innerHTML = '<span class="release-light"></span>Autoplay · minimizing Terminal'
  try {
    await handle.prepare()
    if (handle.state === 'idle' && !windowElement.hidden)
      await handle.minimize()

    releaseBadge.innerHTML = '<span class="release-light"></span>Terminal minimized · click its preview'
    window.setTimeout(() => {
      releaseBadge.innerHTML = '<span class="release-light"></span>dockbar@1.0.0 · unpkg'
    }, 2600)
  }
  catch (error) {
    console.error('Autoplay failed:', error)
    releaseBadge.innerHTML = '<span class="release-light"></span>dockbar@1.0.0 · unpkg'
  }
}

function syncSeparator() {
  separator.hidden = ![...handles.values()].some(handle => transitionStates.has(handle.state))
}

function syncRunningIndicator(id) {
  const indicator = document.querySelector(`[data-indicator-for="${id}"]`)
  indicator.hidden = getWindow(id).hidden
}

function bringToFront(windowElement) {
  topZIndex += 1
  windowElement.style.zIndex = topZIndex
}

function getWindow(id) {
  return document.querySelector(`[data-window-id="${id}"]`)
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function wait(duration) {
  return new Promise(resolve => window.setTimeout(resolve, duration))
}
