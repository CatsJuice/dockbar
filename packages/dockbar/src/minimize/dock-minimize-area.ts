import type { DockItem } from '../components/dock-item'
import {
  createGenieAnimation,
  type GenieAnimationController,
  type GeniePlayOptions,
} from './genie-animation'
import {
  enqueueDocumentAnimation,
  throwIfAborted,
} from './coordinator'
import {
  areGenieRectsEqual,
  captureGenieSnapshot,
  createFallbackGenieSnapshot,
  createGenieSnapshotUrl,
  isRenderableRect,
  isSnapshotSizeCompatible,
  readGenieScrollStateKey,
  readInlineStyle,
  rectFromDomRect,
  restoreInlineStyle,
  revokeGenieSnapshotUrl,
} from './snapshot'
import type {
  DockPosition,
  DockWindowErrorDetail,
  DockWindowHandle,
  DockWindowOperation,
  DockWindowOptions,
  DockWindowState,
  DockWindowStateChangeDetail,
  GenieRect,
  GenieSnapshot,
} from './types'

const HTMLElementBase = (
  typeof globalThis.HTMLElement === 'undefined'
    ? class {}
    : globalThis.HTMLElement
) as typeof HTMLElement

const COLLAPSED_SLOT_SIZE = 0.1
const SLOT_TRANSITION_DURATION_MS = 220
const SLOT_TRANSITION_DELAY_MS = 200
const SNAPSHOT_CAPTURE_TIMEOUT_MS = 1200
const VALID_POSITIONS = new Set<DockPosition>(['top', 'right', 'bottom', 'left'])

type MinimizeDockItem = DockItem & {
  height?: number
  updateComplete?: Promise<unknown>
}

interface PreparedSnapshotRequest {
  promise: Promise<GenieSnapshot | null>
  rect: GenieRect
  scrollStateKey: string
  source: HTMLElement
}

interface ManagedVisibilitySnapshot {
  ariaHidden: string | null
  inert: string | null
  pointerEvents: ReturnType<typeof readInlineStyle>
  source: HTMLElement
  visibility: ReturnType<typeof readInlineStyle>
}

interface SlotAnimation {
  frameId: number
  resolve: () => void
}

interface ThumbnailSize {
  height: number
  width: number
}

interface MinimizedVisual {
  button: HTMLButtonElement
  clickListener: () => void
  focusThumbnailAfterMinimize: boolean
  initialTargetRect?: GenieRect
  item: MinimizeDockItem
  open: boolean
  previouslyFocused: HTMLElement | null
  slotAnimation: SlotAnimation | null
  slotMainSize: number
  slotMargin: number
  snapshot: GenieSnapshot
  source: HTMLElement
  thumbnail: HTMLImageElement
  thumbnailSize: ThumbnailSize
  url: string
}

interface ScheduledSlotTransition {
  cancel: () => void
  ensure: () => Promise<void>
}

interface DockMinimizeAreaController {
  dispatchStateChange: (
    handle: DockWindowHandleImpl,
    previousState: DockWindowState,
  ) => void
  finalizeDispose: (handle: DockWindowHandleImpl) => Promise<void>
  performMinimize: (
    handle: DockWindowHandleImpl,
    signal: AbortSignal,
  ) => Promise<void>
  performRestore: (
    handle: DockWindowHandleImpl,
    signal: AbortSignal,
  ) => Promise<void>
  removeRegistration: (handle: DockWindowHandleImpl) => void
  reportError: (
    handle: DockWindowHandleImpl,
    operation: DockWindowOperation,
    error: unknown,
  ) => void
}

const areaControllers = new WeakMap<DockMinimizeArea, DockMinimizeAreaController>()

function getAreaController(area: DockMinimizeArea) {
  const controller = areaControllers.get(area)
  if (!controller)
    throw new Error('Dock minimize area has not been initialized')
  return controller
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3
}

function parsePositiveNumber(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseNonNegativeNumber(value: string | null, fallback: number) {
  if (value === null)
    return fallback

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function nextFrame(view: Window) {
  return new Promise<void>((resolve) => {
    view.requestAnimationFrame(() => resolve())
  })
}

function waitForImageDecode(ownerDocument: Document, src: string) {
  const ImageConstructor = ownerDocument.defaultView?.Image
  if (!ImageConstructor)
    return Promise.resolve()

  const image = new ImageConstructor()
  image.decoding = 'async'
  image.src = src
  if (image.decode)
    return image.decode().catch(() => undefined)

  return new Promise<void>((resolve) => {
    image.onload = () => resolve()
    image.onerror = () => resolve()
  })
}

function withTimeout<T>(
  view: Window,
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = view.setTimeout(() => {
      reject(new Error(message))
    }, timeoutMs)

    promise.then(
      (value) => {
        view.clearTimeout(timeoutId)
        resolve(value)
      },
      (error) => {
        view.clearTimeout(timeoutId)
        reject(error)
      },
    )
  })
}

class DockWindowHandleImpl implements DockWindowHandle {
  private _abortController: AbortController | null = null
  private _activatingSnapshot = false
  private _captureToken = 0
  private _disposingPromise: Promise<void> | null = null
  private _hidden = false
  private _managedVisibility: ManagedVisibilitySnapshot | null = null
  private _options: DockWindowOptions
  private _snapshotRequest: PreparedSnapshotRequest | null = null
  private _state: DockWindowState = 'idle'
  private _transitionPromise: Promise<void> | null = null
  private readonly _controller: DockMinimizeAreaController

  constructor(
    private readonly _area: DockMinimizeArea,
    options: DockWindowOptions,
  ) {
    this._controller = getAreaController(_area)
    this._options = options
  }

  get id() {
    return this._options.id
  }

  get label() {
    return this._options.label ?? this._options.id
  }

  get state() {
    return this._state
  }

  prepare = async () => {
    if (this._state !== 'idle')
      return

    const source = this._resolveSource()
    if (!source)
      return

    try {
      await this._ensureSnapshotRequest(source).promise
    }
    catch {
      // Hover preparation is opportunistic. minimize() reports and falls back.
    }
  }

  cancelPrepare = () => {
    if (this._activatingSnapshot)
      return

    this._clearPreparedSnapshot()
  }

  invalidatePreparedSnapshot = () => {
    this._clearPreparedSnapshot()
  }

  minimize = () => {
    if (this._state === 'disposed')
      return Promise.reject(new Error(`Dock window "${this.id}" has been disposed`))
    if (this._state === 'minimized')
      return Promise.resolve()
    if (this._state === 'minimizing')
      return this._transitionPromise ?? Promise.resolve()
    if (this._state === 'restoring') {
      return Promise.reject(
        new Error(`Cannot minimize dock window "${this.id}" while it is restoring`),
      )
    }

    this._activatingSnapshot = true
    const abortController = new AbortController()
    this._abortController = abortController

    const transition = enqueueDocumentAnimation(
      this._area.ownerDocument,
      abortController.signal,
      () => this._controller.performMinimize(this, abortController.signal),
    ).then(() => {
      if (this._state !== 'disposed')
        this._setState('minimized')
    }).catch((error: unknown) => {
      if (this._state !== 'disposed') {
        this._setState('idle')
        this._controller.reportError(this, 'minimize', error)
      }
      throw error
    }).finally(() => {
      this._activatingSnapshot = false
      this._clearPreparedSnapshot()
      if (this._transitionPromise === transition) {
        this._transitionPromise = null
        this._abortController = null
      }
    })

    this._transitionPromise = transition
    this._setState('minimizing')
    return transition
  }

  restore = () => {
    if (this._state === 'disposed')
      return Promise.reject(new Error(`Dock window "${this.id}" has been disposed`))
    if (this._state === 'idle')
      return Promise.resolve()
    if (this._state === 'restoring')
      return this._transitionPromise ?? Promise.resolve()
    if (this._state === 'minimizing') {
      return Promise.reject(
        new Error(`Cannot restore dock window "${this.id}" while it is minimizing`),
      )
    }

    const abortController = new AbortController()
    this._abortController = abortController

    const transition = enqueueDocumentAnimation(
      this._area.ownerDocument,
      abortController.signal,
      () => this._controller.performRestore(this, abortController.signal),
    ).then(() => {
      if (this._state !== 'disposed')
        this._setState('idle')
    }).catch((error: unknown) => {
      if (this._state !== 'disposed') {
        this._setState('minimized')
        this._controller.reportError(this, 'restore', error)
      }
      throw error
    }).finally(() => {
      if (this._transitionPromise === transition) {
        this._transitionPromise = null
        this._abortController = null
      }
    })

    this._transitionPromise = transition
    this._setState('restoring')
    return transition
  }

  dispose = () => {
    if (this._disposingPromise)
      return this._disposingPromise

    this._abortController?.abort()
    if (this._state !== 'disposed')
      this._setState('disposed')
    this._controller.removeRegistration(this)

    const settledTransition = this._transitionPromise?.catch(() => undefined)
      ?? Promise.resolve()
    const disposing = settledTransition.then(() => this._controller.finalizeDispose(this))
      .catch((error: unknown) => {
        this._controller.reportError(this, 'dispose', error)
        throw error
      })
    this._disposingPromise = disposing
    return disposing
  }

  _clearPreparedSnapshot() {
    this._captureToken += 1
    this._snapshotRequest = null
  }

  _isHidden() {
    return this._hidden
  }

  async _readSnapshot(source: HTMLElement) {
    const rect = rectFromDomRect(source.getBoundingClientRect())
    const scrollStateKey = readGenieScrollStateKey(source)
    const request = this._snapshotRequest

    if (
      request
      && request.source === source
      && areGenieRectsEqual(request.rect, rect)
      && request.scrollStateKey === scrollStateKey
    ) {
      try {
        const snapshot = await request.promise
        if (snapshot && isSnapshotSizeCompatible(snapshot, rect))
          return snapshot
      }
      catch {
        // A failed speculative capture gets one fresh attempt on activation.
      }
    }

    this._clearPreparedSnapshot()
    return captureGenieSnapshot(source, this._options.capture)
  }

  _resolveSource() {
    const source = typeof this._options.source === 'function'
      ? this._options.source()
      : this._options.source
    if (!source || source.nodeType !== 1)
      return null

    return source
  }

  async _setHidden(
    hidden: boolean,
    operation: DockWindowOperation,
    source: HTMLElement,
  ) {
    if (hidden === this._hidden)
      return

    const adapter = this._options.visibility
    if (adapter) {
      try {
        await adapter.setHidden(hidden, {
          area: this._area,
          handle: this,
          operation,
          source,
          state: this._state,
        })
        this._hidden = hidden
      }
      catch (error) {
        if (hidden)
          this._hidden = true
        throw error
      }
      return
    }

    if (hidden) {
      this._managedVisibility = {
        ariaHidden: source.getAttribute('aria-hidden'),
        inert: source.getAttribute('inert'),
        pointerEvents: readInlineStyle(source.style, 'pointer-events'),
        source,
        visibility: readInlineStyle(source.style, 'visibility'),
      }
      source.style.setProperty('visibility', 'hidden', 'important')
      source.style.setProperty('pointer-events', 'none', 'important')
      source.setAttribute('inert', '')
      source.setAttribute('aria-hidden', 'true')
      this._hidden = true
      return
    }

    const snapshot = this._managedVisibility
    if (snapshot) {
      restoreInlineStyle(snapshot.source.style, 'visibility', snapshot.visibility)
      restoreInlineStyle(
        snapshot.source.style,
        'pointer-events',
        snapshot.pointerEvents,
      )
      if (snapshot.inert === null)
        snapshot.source.removeAttribute('inert')
      else
        snapshot.source.setAttribute('inert', snapshot.inert)

      if (snapshot.ariaHidden === null)
        snapshot.source.removeAttribute('aria-hidden')
      else
        snapshot.source.setAttribute('aria-hidden', snapshot.ariaHidden)
    }
    this._managedVisibility = null
    this._hidden = false
  }

  _setState(state: DockWindowState) {
    if (state === this._state)
      return

    const previousState = this._state
    this._state = state
    this._controller.dispatchStateChange(this, previousState)
  }

  _updateOptions(options: DockWindowOptions) {
    this._options = options
    this._clearPreparedSnapshot()
  }

  private _ensureSnapshotRequest(source: HTMLElement) {
    const rect = rectFromDomRect(source.getBoundingClientRect())
    const scrollStateKey = readGenieScrollStateKey(source)
    const existingRequest = this._snapshotRequest
    if (
      existingRequest
      && existingRequest.source === source
      && areGenieRectsEqual(existingRequest.rect, rect)
      && existingRequest.scrollStateKey === scrollStateKey
    ) {
      return existingRequest
    }

    const token = this._captureToken + 1
    this._captureToken = token
    const promise = captureGenieSnapshot(source, this._options.capture)
      .then(snapshot => this._captureToken === token ? snapshot : null)
    const request = {
      promise,
      rect,
      scrollStateKey,
      source,
    }
    this._snapshotRequest = request
    return request
  }
}

export class DockMinimizeArea extends HTMLElementBase {
  static get observedAttributes() {
    return ['direction', 'gap', 'position', 'size']
  }

  private readonly _handles = new Map<string, DockWindowHandleImpl>()
  private readonly _itemsContainer: HTMLSpanElement | null
  private readonly _visuals = new Map<DockWindowHandleImpl, MinimizedVisual>()

  constructor() {
    super()

    areaControllers.set(this, {
      dispatchStateChange: (handle, previousState) => {
        this._dispatchStateChange(handle, previousState)
      },
      finalizeDispose: handle => this._finalizeDispose(handle),
      performMinimize: (handle, signal) => this._performMinimize(handle, signal),
      performRestore: (handle, signal) => this._performRestore(handle, signal),
      removeRegistration: handle => this._removeRegistration(handle),
      reportError: (handle, operation, error) => {
        this._reportError(handle, operation, error)
      },
    })

    if (typeof globalThis.document === 'undefined') {
      this._itemsContainer = null
      return
    }

    const shadowRoot = this.attachShadow({ mode: 'open' })
    const style = this.ownerDocument.createElement('style')
    style.textContent = `
      :host,
      #items {
        display: contents;
      }

      dock-item > button {
        align-items: center;
        appearance: none;
        background: transparent;
        border: 0;
        box-sizing: border-box;
        cursor: default;
        display: flex;
        height: 100%;
        justify-content: center;
        margin: 0;
        padding: 0;
        position: relative;
        width: 100%;
      }

      dock-item > button:focus-visible {
        outline: 2px solid Highlight;
        outline-offset: 2px;
      }

      dock-item > button > img {
        border-radius: 4px;
        box-shadow: 0 14px 28px rgba(15, 23, 42, 0.2);
        display: block;
        flex: 0 0 auto;
        height: var(--dock-thumbnail-height, 100%);
        object-fit: fill;
        transition: none;
        width: var(--dock-thumbnail-width, 100%);
      }
    `
    const items = this.ownerDocument.createElement('span')
    items.id = 'items'
    shadowRoot.append(style, items)
    this._itemsContainer = items
  }

  get dockItems(): DockItem[] {
    if (!this._itemsContainer)
      return []

    return Array.from(this._itemsContainer.children)
      .filter((element): element is DockItem => element.nodeName === 'DOCK-ITEM')
  }

  get dockItemsSortable() {
    return true
  }

  get dockItemSortContainer() {
    return this._itemsContainer
  }

  prepareDockItemDragPreview(item: DockItem, preview: DockItem) {
    const sourceButton = item.querySelector('button')
    const previewButton = preview.querySelector('button')
    const sourceThumbnail = sourceButton?.querySelector('img')
    const previewThumbnail = previewButton?.querySelector('img')
    const view = this.ownerDocument.defaultView
    if (!sourceButton || !previewButton || !sourceThumbnail || !previewThumbnail || !view)
      return

    for (const property of ['--dock-thumbnail-height', '--dock-thumbnail-width']) {
      const value = item.style.getPropertyValue(property)
      if (value)
        preview.style.setProperty(property, value)
    }

    const copyProperties = (
      source: HTMLElement,
      target: HTMLElement,
      properties: string[],
    ) => {
      const sourceStyle = view.getComputedStyle(source)
      properties.forEach((property) => {
        target.style.setProperty(property, sourceStyle.getPropertyValue(property))
      })
    }

    copyProperties(sourceButton, previewButton, [
      'align-items',
      'appearance',
      'background',
      'border',
      'box-sizing',
      'display',
      'height',
      'justify-content',
      'margin',
      'padding',
      'position',
      'width',
    ])
    copyProperties(sourceThumbnail, previewThumbnail, [
      'border-radius',
      'box-shadow',
      'display',
      'flex',
      'height',
      'object-fit',
      'width',
    ])
  }

  connectedCallback() {
    this.setAttribute('role', this.getAttribute('role') ?? 'group')
  }

  disconnectedCallback() {
    for (const handle of [...this._handles.values()])
      void handle.dispose().catch(() => undefined)
  }

  attributeChangedCallback(
    _name: string,
    oldValue: string | null,
    newValue: string | null,
  ) {
    if (oldValue === newValue)
      return

    for (const visual of this._visuals.values())
      this._syncVisualGeometry(visual)
  }

  registerWindow(options: DockWindowOptions): DockWindowHandle {
    const normalizedOptions = this._normalizeOptions(options)
    const existing = this._handles.get(normalizedOptions.id)
    if (existing) {
      if (existing.state !== 'idle') {
        throw new Error(
          `Cannot update dock window "${normalizedOptions.id}" while its state is "${existing.state}"`,
        )
      }
      existing._updateOptions(normalizedOptions)
      return existing
    }

    const handle = new DockWindowHandleImpl(this, normalizedOptions)
    this._handles.set(normalizedOptions.id, handle)
    return handle
  }

  getWindow(id: string): DockWindowHandle | undefined {
    return this._handles.get(id)
  }

  minimize(idOrOptions: string | DockWindowOptions) {
    const handle = typeof idOrOptions === 'string'
      ? this._handles.get(idOrOptions)
      : this.registerWindow(idOrOptions) as DockWindowHandleImpl
    if (!handle) {
      return Promise.reject(
        new Error(`Dock window "${idOrOptions}" has not been registered`),
      )
    }

    return handle.minimize()
  }

  restore(id: string) {
    const handle = this._handles.get(id)
    if (!handle)
      return Promise.reject(new Error(`Dock window "${id}" has not been registered`))

    return handle.restore()
  }

  async unregisterWindow(id: string) {
    const handle = this._handles.get(id)
    if (!handle)
      return false

    await handle.dispose()
    return true
  }

  private _dispatchStateChange(
    handle: DockWindowHandleImpl,
    previousState: DockWindowState,
  ) {
    const EventConstructor = this.ownerDocument.defaultView?.CustomEvent
    if (!EventConstructor)
      return

    this.dispatchEvent(new EventConstructor<DockWindowStateChangeDetail>(
      'on-window-state-change',
      {
        bubbles: true,
        composed: true,
        detail: {
          area: this,
          handle,
          id: handle.id,
          previousState,
          state: handle.state,
        },
      },
    ))
  }

  private _reportError(
    handle: DockWindowHandleImpl,
    operation: DockWindowOperation,
    error: unknown,
  ) {
    if (isAbortError(error) && handle.state === 'disposed')
      return

    const EventConstructor = this.ownerDocument.defaultView?.CustomEvent
    if (!EventConstructor)
      return

    this.dispatchEvent(new EventConstructor<DockWindowErrorDetail>(
      'on-window-error',
      {
        bubbles: true,
        composed: true,
        detail: {
          area: this,
          error,
          handle,
          id: handle.id,
          operation,
        },
      },
    ))
  }

  private _removeRegistration(handle: DockWindowHandleImpl) {
    if (this._handles.get(handle.id) === handle)
      this._handles.delete(handle.id)
  }

  private async _performMinimize(
    handle: DockWindowHandleImpl,
    signal: AbortSignal,
  ) {
    const source = handle._resolveSource()
    if (!source || !source.isConnected)
      throw new Error(`Source element for dock window "${handle.id}" is not mounted`)
    if (source.ownerDocument !== this.ownerDocument) {
      throw new Error(
        `Source element for dock window "${handle.id}" belongs to a different document`,
      )
    }

    const view = this.ownerDocument.defaultView
    if (!view)
      throw new Error('Dock window animations require a browser window')

    let visual: MinimizedVisual | null = null
    let animation: GenieAnimationController | null = null
    let pendingSnapshotUrl: string | null = null
    let sourceWasHidden = false
    let scheduledSlot: ScheduledSlotTransition | null = null

    try {
      throwIfAborted(signal)
      const snapshot = await this._captureSnapshot(handle, source, view)
      throwIfAborted(signal)
      const url = await this._createSnapshotUrlWithFallback(
        handle,
        source,
        snapshot,
      )
      pendingSnapshotUrl = url.url
      throwIfAborted(signal)
      await waitForImageDecode(this.ownerDocument, url.url)
      throwIfAborted(signal)

      visual = await this._createVisual(
        handle,
        source,
        url.snapshot,
        url.url,
      )
      pendingSnapshotUrl = null
      await nextFrame(view)
      throwIfAborted(signal)

      if (this._prefersReducedMotion(view)) {
        this._blurSourceFocus(visual)
        await handle._setHidden(true, 'minimize', source)
        sourceWasHidden = true
        this._setSlotImmediate(visual, true)
        this._setThumbnailVisible(visual, true)
        return
      }

      const originalRect = visual.snapshot.rect
      const initialTargetRect = rectFromDomRect(
        visual.thumbnail.getBoundingClientRect(),
      )
      const targetRect = isRenderableRect(visual.initialTargetRect ?? initialTargetRect)
        ? visual.initialTargetRect ?? initialTargetRect
        : initialTargetRect
      animation = createGenieAnimation({
        direction: 'minimize',
        originalRect,
        ownerDocument: this.ownerDocument,
        position: this._getPosition(),
        sourceCanvas: visual.snapshot.canvas,
        targetRect,
      })

      if (!animation) {
        this._blurSourceFocus(visual)
        await handle._setHidden(true, 'minimize', source)
        sourceWasHidden = true
        this._setSlotImmediate(visual, true)
        this._setThumbnailVisible(visual, true)
        return
      }

      this._blurSourceFocus(visual)
      await handle._setHidden(true, 'minimize', source)
      sourceWasHidden = true
      scheduledSlot = this._scheduleSlotTransition(visual, true)
      const interrupted = await this._playAnimation(
        animation,
        signal,
        {
          beforeFinish: async ({ drawFinalFrame }) => {
            await scheduledSlot?.ensure()
            const finalRect = rectFromDomRect(
              visual!.thumbnail.getBoundingClientRect(),
            )
            if (isRenderableRect(finalRect))
              drawFinalFrame(finalRect)
            this._setThumbnailVisible(visual!, true)
            await nextFrame(view)
          },
        },
      )

      if (interrupted) {
        scheduledSlot.cancel()
        this._setSlotImmediate(visual, true)
        this._setThumbnailVisible(visual, true)
      }
      else {
        await scheduledSlot.ensure()
        this._setThumbnailVisible(visual, true)
      }
    }
    catch (error) {
      animation?.cancel()
      scheduledSlot?.cancel()
      if (sourceWasHidden || handle._isHidden()) {
        try {
          await handle._setHidden(false, 'minimize', source)
          if (handle.state !== 'disposed' && visual?.previouslyFocused)
            this._restoreSourceFocus(visual)
        }
        catch (visibilityError) {
          this._reportError(handle, 'minimize', visibilityError)
        }
      }
      if (visual)
        this._destroyVisual(handle, visual)
      else if (pendingSnapshotUrl)
        revokeGenieSnapshotUrl(pendingSnapshotUrl)
      throw error
    }
  }

  private async _performRestore(
    handle: DockWindowHandleImpl,
    signal: AbortSignal,
  ) {
    const visual = this._visuals.get(handle)
    if (!visual)
      throw new Error(`Dock window "${handle.id}" has no minimized snapshot`)
    if (!visual.source.isConnected)
      throw new Error(`Source element for dock window "${handle.id}" is not mounted`)

    const view = this.ownerDocument.defaultView
    if (!view)
      throw new Error('Dock window animations require a browser window')

    let sourceWasShown = false
    let scheduledSlot: ScheduledSlotTransition | null = null

    try {
      throwIfAborted(signal)
      await Promise.resolve(visual.item.updateComplete)
      await nextFrame(view)
      throwIfAborted(signal)
      const restoreFocus = this._isElementFocused(visual.button)
      if (this._prefersReducedMotion(view)) {
        this._setThumbnailVisible(visual, false)
        await handle._setHidden(false, 'restore', visual.source)
        sourceWasShown = true
        if (restoreFocus)
          this._restoreSourceFocus(visual)
        this._setSlotImmediate(visual, false)
        this._destroyVisual(handle, visual)
        return
      }

      const measuredSourceRect = rectFromDomRect(
        visual.source.getBoundingClientRect(),
      )
      const originalRect = isRenderableRect(measuredSourceRect)
        ? measuredSourceRect
        : visual.snapshot.rect
      const targetRect = rectFromDomRect(visual.thumbnail.getBoundingClientRect())
      if (!isRenderableRect(targetRect))
        throw new Error(`Dock thumbnail for window "${handle.id}" is not renderable`)

      const animation = createGenieAnimation({
        direction: 'restore',
        originalRect,
        ownerDocument: this.ownerDocument,
        position: this._getPosition(),
        sourceCanvas: visual.snapshot.canvas,
        targetRect,
      })
      this._setThumbnailVisible(visual, false)

      if (!animation) {
        await handle._setHidden(false, 'restore', visual.source)
        sourceWasShown = true
        if (restoreFocus)
          this._restoreSourceFocus(visual)
        this._setSlotImmediate(visual, false)
        this._destroyVisual(handle, visual)
        return
      }

      scheduledSlot = this._scheduleSlotTransition(visual, false)
      const interrupted = await this._playAnimation(
        animation,
        signal,
        {
          beforeFinish: async () => {
            await handle._setHidden(false, 'restore', visual.source)
            sourceWasShown = true
            if (restoreFocus)
              this._restoreSourceFocus(visual)
          },
        },
      )

      if (interrupted && !sourceWasShown) {
        await handle._setHidden(false, 'restore', visual.source)
        sourceWasShown = true
        if (restoreFocus)
          this._restoreSourceFocus(visual)
      }

      if (interrupted) {
        scheduledSlot.cancel()
        this._setSlotImmediate(visual, false)
      }
      else {
        await scheduledSlot.ensure()
      }
      this._destroyVisual(handle, visual)
    }
    catch (error) {
      scheduledSlot?.cancel()
      this._setSlotImmediate(visual, true)
      this._setThumbnailVisible(visual, true)
      if (sourceWasShown || !handle._isHidden()) {
        try {
          await handle._setHidden(true, 'restore', visual.source)
        }
        catch (visibilityError) {
          this._reportError(handle, 'restore', visibilityError)
        }
      }
      if (visual.button.isConnected)
        visual.button.focus({ preventScroll: true })
      throw error
    }
  }

  private async _finalizeDispose(handle: DockWindowHandleImpl) {
    const visual = this._visuals.get(handle)
    const source = visual?.source ?? handle._resolveSource()
    try {
      if (source && handle._isHidden())
        await handle._setHidden(false, 'dispose', source)
    }
    finally {
      if (visual)
        this._destroyVisual(handle, visual)
      handle._clearPreparedSnapshot()
    }
  }

  private async _captureSnapshot(
    handle: DockWindowHandleImpl,
    source: HTMLElement,
    view: Window,
  ) {
    try {
      const snapshot = await withTimeout(
        view,
        handle._readSnapshot(source),
        SNAPSHOT_CAPTURE_TIMEOUT_MS,
        `Snapshot capture for dock window "${handle.id}" timed out`,
      )
      if (snapshot)
        return snapshot
    }
    catch (error) {
      this._reportError(handle, 'minimize', error)
    }

    const fallback = createFallbackGenieSnapshot(source)
    if (!fallback)
      throw new Error(`Could not capture dock window "${handle.id}"`)
    return fallback
  }

  private async _createSnapshotUrlWithFallback(
    handle: DockWindowHandleImpl,
    source: HTMLElement,
    snapshot: GenieSnapshot,
  ) {
    try {
      return {
        snapshot,
        url: await createGenieSnapshotUrl(snapshot.canvas),
      }
    }
    catch (error) {
      this._reportError(handle, 'minimize', error)
      const fallback = createFallbackGenieSnapshot(source)
      if (!fallback)
        throw error
      return {
        snapshot: fallback,
        url: await createGenieSnapshotUrl(fallback.canvas),
      }
    }
  }

  private async _createVisual(
    handle: DockWindowHandleImpl,
    source: HTMLElement,
    snapshot: GenieSnapshot,
    url: string,
  ) {
    const container = this._itemsContainer
    if (!container) {
      revokeGenieSnapshotUrl(url)
      throw new Error('Dock minimize area is unavailable outside the browser')
    }

    const item = this.ownerDocument.createElement('dock-item') as MinimizeDockItem
    const button = this.ownerDocument.createElement('button')
    const thumbnail = this.ownerDocument.createElement('img')
    const thumbnailSize = this._getThumbnailSize(snapshot.rect)
    const clickListener = () => {
      void handle.restore().catch(() => undefined)
    }
    const visual: MinimizedVisual = {
      button,
      clickListener,
      focusThumbnailAfterMinimize: false,
      item,
      open: true,
      previouslyFocused: this._getFocusedDescendant(source),
      slotAnimation: null,
      slotMainSize: this._isHorizontal()
        ? thumbnailSize.width
        : thumbnailSize.height,
      slotMargin: 0,
      snapshot,
      source,
      thumbnail,
      thumbnailSize,
      url,
    }

    item.setAttribute('part', 'item')
    item.setAttribute('data-dock-minimized-window', handle.id)
    item.setAttribute('data-window-id', handle.id)
    item.style.pointerEvents = 'none'
    button.type = 'button'
    button.setAttribute('part', 'button')
    button.setAttribute('data-window-id', handle.id)
    button.setAttribute('aria-label', `Restore ${handle.label}`)
    button.tabIndex = -1
    button.addEventListener('click', clickListener)
    thumbnail.setAttribute('part', 'thumbnail')
    thumbnail.alt = ''
    thumbnail.decoding = 'async'
    thumbnail.draggable = false
    thumbnail.src = url
    button.appendChild(thumbnail)
    item.appendChild(button)
    this._configureItemDimensions(visual)
    this._setThumbnailVisible(visual, false)

    this._visuals.set(handle, visual)
    container.appendChild(item)
    this._dispatchDockItemsChange()

    try {
      await Promise.resolve(item.updateComplete)
      const view = this.ownerDocument.defaultView
      if (view)
        await nextFrame(view)
      const targetRect = rectFromDomRect(thumbnail.getBoundingClientRect())
      if (!isRenderableRect(targetRect))
        throw new Error(`Could not measure dock thumbnail for window "${handle.id}"`)
      visual.initialTargetRect = targetRect
      this._setSlotImmediate(visual, false)
      return visual
    }
    catch (error) {
      this._destroyVisual(handle, visual)
      throw error
    }
  }

  private _configureItemDimensions(visual: MinimizedVisual) {
    const dockSize = this._getDockSize()
    const itemWidth = this._isHorizontal()
      ? visual.thumbnailSize.width
      : dockSize
    const itemHeight = this._isHorizontal()
      ? dockSize
      : visual.thumbnailSize.height

    visual.item.width = itemWidth
    visual.item.height = itemHeight
    visual.item.setAttribute('width', String(itemWidth))
    visual.item.setAttribute('height', String(itemHeight))
    visual.item.style.setProperty(
      '--dock-thumbnail-width',
      `${visual.thumbnailSize.width}px`,
    )
    visual.item.style.setProperty(
      '--dock-thumbnail-height',
      `${visual.thumbnailSize.height}px`,
    )
  }

  private _destroyVisual(
    handle: DockWindowHandleImpl,
    visual: MinimizedVisual,
  ) {
    this._cancelSlotAnimation(visual)
    visual.button.removeEventListener('click', visual.clickListener)
    visual.item.remove()
    revokeGenieSnapshotUrl(visual.url)
    visual.snapshot.canvas.width = 1
    visual.snapshot.canvas.height = 1
    if (this._visuals.get(handle) === visual)
      this._visuals.delete(handle)
    this._dispatchDockItemsChange()
  }

  private _dispatchDockItemsChange() {
    const EventConstructor = this.ownerDocument.defaultView?.CustomEvent
    if (!EventConstructor)
      return

    this.dispatchEvent(new EventConstructor('dock-items-change', {
      bubbles: true,
      composed: true,
    }))
  }

  private _getPosition(): DockPosition {
    const position = this.getAttribute('position') as DockPosition | null
    return position && VALID_POSITIONS.has(position) ? position : 'bottom'
  }

  private _isHorizontal() {
    const direction = this.getAttribute('direction')
    if (direction === 'horizontal')
      return true
    if (direction === 'vertical')
      return false

    const position = this._getPosition()
    return position === 'top' || position === 'bottom'
  }

  private _getDockSize() {
    return parsePositiveNumber(this.getAttribute('size'), 40)
  }

  private _getGap() {
    return parseNonNegativeNumber(this.getAttribute('gap'), 5)
  }

  private _getThumbnailSize(rect: GenieRect): ThumbnailSize {
    const dockSize = this._getDockSize()
    const aspectRatio = rect.width / rect.height
    if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
      return {
        height: dockSize,
        width: dockSize,
      }
    }

    if (aspectRatio >= 1) {
      return {
        height: dockSize / aspectRatio,
        width: dockSize,
      }
    }

    return {
      height: dockSize,
      width: dockSize * aspectRatio,
    }
  }

  private _normalizeOptions(options: DockWindowOptions): DockWindowOptions {
    if (!options || typeof options !== 'object')
      throw new TypeError('registerWindow() requires window options')

    const id = options.id?.trim()
    if (!id)
      throw new TypeError('Dock window id must be a non-empty string')
    if (!options.source)
      throw new TypeError(`Dock window "${id}" requires a source element`)
    if (
      options.visibility
      && typeof options.visibility.setHidden !== 'function'
    ) {
      throw new TypeError(
        `Visibility adapter for dock window "${id}" requires setHidden()`,
      )
    }

    return {
      ...options,
      id,
      label: options.label?.trim() || id,
    }
  }

  private _prefersReducedMotion(view: Window) {
    return typeof view.matchMedia === 'function'
      && view.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  private _setThumbnailVisible(visual: MinimizedVisual, visible: boolean) {
    visual.thumbnail.style.opacity = visible ? '1' : '0'
    visual.button.style.pointerEvents = visible ? 'auto' : 'none'
    visual.button.tabIndex = visible ? 0 : -1
    visual.item.style.pointerEvents = visible ? 'auto' : 'none'
    if (
      visible
      && visual.focusThumbnailAfterMinimize
      && (
        this.ownerDocument.activeElement === this.ownerDocument.body
        || this.ownerDocument.activeElement === null
      )
    ) {
      visual.focusThumbnailAfterMinimize = false
      visual.button.focus({ preventScroll: true })
    }
  }

  private _applySlotStyle(
    visual: MinimizedVisual,
    mainSize: number,
    margin: number,
  ) {
    const style = visual.item.style
    if (this._isHorizontal()) {
      style.removeProperty('height')
      style.removeProperty('margin-top')
      style.width = `${mainSize}px`
      style.flexBasis = `${mainSize}px`
      style.marginLeft = `${margin}px`
    }
    else {
      style.removeProperty('width')
      style.removeProperty('margin-left')
      style.height = `${mainSize}px`
      style.flexBasis = `${mainSize}px`
      style.marginTop = `${margin}px`
    }
    visual.slotMainSize = mainSize
    visual.slotMargin = margin
  }

  private _setSlotImmediate(visual: MinimizedVisual, open: boolean) {
    this._cancelSlotAnimation(visual)
    visual.open = open
    if (!open) {
      this._applySlotStyle(
        visual,
        COLLAPSED_SLOT_SIZE,
        -this._getGap(),
      )
      return
    }

    const mainSize = this._isHorizontal()
      ? visual.thumbnailSize.width
      : visual.thumbnailSize.height
    this._applySlotStyle(visual, mainSize, 0)
    if (this._isHorizontal()) {
      visual.item.style.removeProperty('width')
      visual.item.style.removeProperty('flex-basis')
      visual.item.style.removeProperty('margin-left')
    }
    else {
      visual.item.style.removeProperty('height')
      visual.item.style.removeProperty('flex-basis')
      visual.item.style.removeProperty('margin-top')
    }
  }

  private _animateSlot(visual: MinimizedVisual, open: boolean) {
    this._cancelSlotAnimation(visual)
    visual.open = open

    const view = this.ownerDocument.defaultView
    if (!view) {
      this._setSlotImmediate(visual, open)
      return Promise.resolve()
    }

    const fromSize = visual.slotMainSize
    const fromMargin = visual.slotMargin
    const toSize = open
      ? this._isHorizontal()
        ? visual.thumbnailSize.width
        : visual.thumbnailSize.height
      : COLLAPSED_SLOT_SIZE
    const toMargin = open ? 0 : -this._getGap()
    if (
      Math.abs(fromSize - toSize) < 0.1
      && Math.abs(fromMargin - toMargin) < 0.1
    ) {
      this._setSlotImmediate(visual, open)
      return Promise.resolve()
    }

    const startedAt = view.performance.now()
    return new Promise<void>((resolve) => {
      const slotAnimation: SlotAnimation = {
        frameId: 0,
        resolve,
      }
      visual.slotAnimation = slotAnimation

      const tick = (now: number) => {
        if (visual.slotAnimation !== slotAnimation)
          return

        const progress = Math.min(
          Math.max((now - startedAt) / SLOT_TRANSITION_DURATION_MS, 0),
          1,
        )
        const easedProgress = easeOutCubic(progress)
        this._applySlotStyle(
          visual,
          fromSize + (toSize - fromSize) * easedProgress,
          fromMargin + (toMargin - fromMargin) * easedProgress,
        )

        if (progress >= 1) {
          visual.slotAnimation = null
          this._setSlotImmediate(visual, open)
          resolve()
          return
        }

        slotAnimation.frameId = view.requestAnimationFrame(tick)
      }

      slotAnimation.frameId = view.requestAnimationFrame(tick)
    })
  }

  private _cancelSlotAnimation(visual: MinimizedVisual) {
    const animation = visual.slotAnimation
    if (!animation)
      return

    this.ownerDocument.defaultView?.cancelAnimationFrame(animation.frameId)
    visual.slotAnimation = null
    animation.resolve()
  }

  private _scheduleSlotTransition(
    visual: MinimizedVisual,
    open: boolean,
  ): ScheduledSlotTransition {
    const view = this.ownerDocument.defaultView
    let promise: Promise<void> | null = null
    let timerId: number | null = null

    const start = () => {
      if (!promise)
        promise = this._animateSlot(visual, open)
      return promise
    }

    if (view) {
      timerId = view.setTimeout(() => {
        timerId = null
        void start()
      }, SLOT_TRANSITION_DELAY_MS)
    }

    return {
      cancel: () => {
        if (timerId !== null)
          view?.clearTimeout(timerId)
        timerId = null
        this._cancelSlotAnimation(visual)
      },
      ensure: () => {
        if (timerId !== null)
          view?.clearTimeout(timerId)
        timerId = null
        return start()
      },
    }
  }

  private async _playAnimation(
    animation: GenieAnimationController,
    signal: AbortSignal,
    options?: GeniePlayOptions,
  ) {
    const view = this.ownerDocument.defaultView
    if (!view) {
      animation.cancel()
      throw new Error('Dock window animations require a browser window')
    }

    let interrupted = false
    const visualViewport = view.visualViewport
    const onViewportChange = () => {
      interrupted = true
      animation.cancel()
    }
    const onAbort = () => animation.cancel()

    view.addEventListener('resize', onViewportChange)
    view.addEventListener('scroll', onViewportChange, true)
    visualViewport?.addEventListener('resize', onViewportChange)
    visualViewport?.addEventListener('scroll', onViewportChange)
    signal.addEventListener('abort', onAbort, { once: true })

    try {
      throwIfAborted(signal)
      await animation.play(options)
      throwIfAborted(signal)
      return interrupted
    }
    finally {
      view.removeEventListener('resize', onViewportChange)
      view.removeEventListener('scroll', onViewportChange, true)
      visualViewport?.removeEventListener('resize', onViewportChange)
      visualViewport?.removeEventListener('scroll', onViewportChange)
      signal.removeEventListener('abort', onAbort)
    }
  }

  private _syncVisualGeometry(visual: MinimizedVisual) {
    this._cancelSlotAnimation(visual)
    visual.thumbnailSize = this._getThumbnailSize(visual.snapshot.rect)
    this._configureItemDimensions(visual)
    this._setSlotImmediate(visual, visual.open)
  }

  private _getFocusedDescendant(source: HTMLElement) {
    const activeElement = this.ownerDocument.activeElement
    return activeElement
      && activeElement.nodeType === 1
      && (activeElement === source || source.contains(activeElement))
      ? activeElement as HTMLElement
      : null
  }

  private _isElementFocused(element: HTMLElement) {
    const root = element.getRootNode() as Document | ShadowRoot
    return root.activeElement === element
  }

  private _blurSourceFocus(visual: MinimizedVisual) {
    const activeElement = this._getFocusedDescendant(visual.source)
    if (!activeElement)
      return

    visual.previouslyFocused = activeElement
    visual.focusThumbnailAfterMinimize = true
    activeElement.blur()
  }

  private _restoreSourceFocus(visual: MinimizedVisual) {
    const previous = visual.previouslyFocused
    if (previous?.isConnected) {
      previous.focus({ preventScroll: true })
      if (this.ownerDocument.activeElement === previous)
        return
    }

    const previousTabIndex = visual.source.getAttribute('tabindex')
    visual.source.setAttribute('tabindex', '-1')
    visual.source.focus({ preventScroll: true })
    if (previousTabIndex === null)
      visual.source.removeAttribute('tabindex')
    else
      visual.source.setAttribute('tabindex', previousTabIndex)
  }
}

if (
  typeof globalThis.customElements !== 'undefined'
  && !globalThis.customElements.get('dock-minimize-area')
) {
  globalThis.customElements.define('dock-minimize-area', DockMinimizeArea)
}

declare global {
  interface HTMLElementEventMap {
    'on-window-error': CustomEvent<DockWindowErrorDetail>
    'on-window-state-change': CustomEvent<DockWindowStateChangeDetail>
  }

  interface HTMLElementTagNameMap {
    'dock-minimize-area': DockMinimizeArea
  }
}
