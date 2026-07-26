import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { animate } from 'animejs'
import type { DockItem } from './dock-item'
import type { DockSeparator } from './dock-separator'

export type DockPosition = 'top' | 'right' | 'bottom' | 'left'
export type DockDirection = 'horizontal' | 'vertical'

export interface DockSortDetail {
  item: DockItem
  oldIndex: number
  newIndex: number
}

export interface DockDeleteDetail {
  item: DockItem
  index: number
}

interface DockBlock {
  items: DockItem[]
  nextSeparator: DockSeparator | null
  previousSeparator: DockSeparator | null
}

type DockLayoutChild = DockItem | DockSeparator

interface DragState {
  active: boolean
  block: DockBlock
  currentIndex: number
  invalid: boolean
  item: DockItem
  originBlockIndex: number
  originIndex: number
  originRect: DOMRect
  outside: boolean
  placeholder: HTMLDivElement
  preview: DockItem | null
  previewPosition: DragPreviewPosition | null
  pointerId: number
  pointerOffset: {
    x: number
    y: number
  }
  start: {
    x: number
    y: number
  }
}

interface DragBlockBounds {
  max: number
  min: number
}

interface DragPreviewPosition {
  left: number
  top: number
}

interface PointerPosition {
  clientX: number
  clientY: number
}

interface PendingDragMove extends PointerPosition {
  pointerId: number
}

const DRAG_START_DISTANCE = 6
const DRAG_SCALE = 1.08
const DRAG_BOUNDARY_INSET = 4
const REORDER_DURATION = 220
const REORDER_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const SNAP_BACK_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
const DELETE_EASE = 'cubic-bezier(0.4, 0, 1, 1)'
const isServer = typeof globalThis.window === 'undefined' && typeof globalThis.document === 'undefined'

function asBoolean(value: boolean | string) {
  return value === '' || value === true || value === 'true'
}

function asNumber(value: number | string) {
  return typeof value === 'number' ? value : Number(value)
}

function clamp(value: number, min: number, max: number) {
  if (max < min)
    return min

  return Math.min(Math.max(value, min), max)
}

function calculateHoverScale(
  pointerPosition: number,
  itemCenter: number,
  itemSize: number,
  maxRange: number,
  maxScale: number,
) {
  const centerDistance = Math.abs(pointerPosition - itemCenter)
  if (
    centerDistance >= maxRange
    || itemSize <= 0
    || maxRange <= 0
    || maxScale <= 1
  )
    return 1

  const d1 = itemCenter - itemSize / 2 - pointerPosition
  const d2 = itemCenter + itemSize / 2 - pointerPosition
  const angleFactor = Math.PI / (2 * maxRange)
  const normalization = 2 * Math.sin(angleFactor * itemSize / 2)

  if (Math.abs(normalization) < Number.EPSILON)
    return 1

  const maxSize = itemSize * maxScale
  const averageSineSlope
    = (Math.sin(angleFactor * d2) - Math.sin(angleFactor * d1)) / (d2 - d1)
  const scale = 1 + (maxSize - itemSize) / normalization * averageSineSlope

  return clamp(scale, 1, maxScale)
}

function isDockItemElement(node: Element): node is DockItem {
  return node.nodeName.toUpperCase() === 'DOCK-ITEM'
}

function isDockSeparatorElement(node: Element): node is DockSeparator {
  return node.nodeName.toUpperCase() === 'DOCK-SEPARATOR'
}

function isDockLayoutChild(node: Element): node is DockLayoutChild {
  return isDockItemElement(node) || isDockSeparatorElement(node)
}

@customElement('dock-wrapper')
export class DockWrapper extends LitElement {
  private _children: DockItem[] = []
  private _layoutChildren: DockLayoutChild[] = []
  private _dragFrame: number | null = null
  private _dragState: DragState | null = null
  private _hoverFrame: number | null = null
  private _mousePos = { x: 0, y: 0 }
  private _moving = false
  private _pendingDragMove: PendingDragMove | null = null
  private _pendingHoverMove: PointerPosition | null = null
  private _ready = false
  private _suppressClick = false

  private readonly onHostClick = (e: Event) => {
    if (!this._suppressClick)
      return
    e.preventDefault()
    e.stopPropagation()
    this._suppressClick = false
  }

  private readonly onHostDragStart = (e: DragEvent) => {
    if (this.sortableValue)
      e.preventDefault()
  }

  private readonly onHostMouseleave = () => {
    this.cancelHoverFrame()
    this._mousePos = { x: 0, y: 0 }
    this.resetAll()
  }

  private readonly onHostMousemove = (e: MouseEvent) => {
    if (this._dragState?.active)
      return
    this.queueHoverScale(e.clientX, e.clientY)
  }

  private readonly onHostPointerDown = (e: PointerEvent) => {
    if (this._dragState || !this.sortableValue || this.disabledValue || e.button !== 0)
      return

    const item = this.getDockItemFromEvent(e)
    if (!item)
      return

    const originRect = item.getBoundingClientRect()
    const items = this.getDockItems()
    const block = this.getDockBlockForItem(item)
    const originBlockIndex = block.items.indexOf(item)
    if (originBlockIndex < 0)
      return

    this._dragState = {
      active: false,
      block,
      currentIndex: originBlockIndex,
      invalid: false,
      item,
      originBlockIndex,
      originIndex: items.indexOf(item),
      originRect,
      outside: false,
      placeholder: this.createPlaceholder(originRect),
      preview: null,
      previewPosition: null,
      pointerId: e.pointerId,
      pointerOffset: {
        x: e.clientX - originRect.left,
        y: e.clientY - originRect.top,
      },
      start: {
        x: e.clientX,
        y: e.clientY,
      },
    }

    window.addEventListener('pointermove', this.onWindowPointerMove)
    window.addEventListener('pointerup', this.onWindowPointerUp)
    window.addEventListener('pointercancel', this.onWindowPointerUp)
  }

  private readonly onWindowPointerMove = (e: PointerEvent) => {
    const dragState = this._dragState
    if (!dragState || e.pointerId !== dragState.pointerId)
      return

    const deltaX = e.clientX - dragState.start.x
    const deltaY = e.clientY - dragState.start.y

    if (!dragState.active) {
      if (Math.hypot(deltaX, deltaY) < DRAG_START_DISTANCE)
        return
      this.beginDrag(dragState, e.clientX, e.clientY)
    }

    e.preventDefault()
    this._suppressClick = true
    this.queueDragMove(e.clientX, e.clientY, e.pointerId)
  }

  private readonly onWindowPointerUp = (e: PointerEvent) => {
    const dragState = this._dragState
    if (!dragState || e.pointerId !== dragState.pointerId)
      return

    window.removeEventListener('pointermove', this.onWindowPointerMove)
    window.removeEventListener('pointerup', this.onWindowPointerUp)
    window.removeEventListener('pointercancel', this.onWindowPointerUp)

    if (e.type === 'pointercancel') {
      this.cancelDragFrame()
      if (dragState.active)
        this.cancelDrag(dragState)
      else
        this._dragState = null
      return
    }

    if (dragState.active) {
      this._pendingDragMove = {
        clientX: e.clientX,
        clientY: e.clientY,
        pointerId: e.pointerId,
      }
    }
    this.flushDragMove()
    this.cancelDragFrame()

    if (!dragState.active) {
      this._dragState = null
      return
    }

    if (dragState.outside) {
      if (this.allowDragDeleteValue)
        this.finishDelete(dragState)
      else
        this.cancelDrag(dragState)
      return
    }

    if (dragState.invalid) {
      this.cancelDrag(dragState)
      return
    }

    this.finishSort(dragState)
  }

  @property({ type: Boolean, attribute: 'allow-drag-delete' })
  allowDragDelete = false

  @property({ type: Boolean })
  disabled = false

  @property({ type: String })
  direction: DockDirection = 'horizontal'

  @property({ type: String })
  easing = 'cubic-bezier(0, 0.55, 0.45, 1)'

  @property({ type: Number })
  gap = 5

  @property({ type: Number, attribute: 'max-range' })
  maxRange = 200

  @property({ type: Number, attribute: 'max-scale' })
  maxScale = 2

  @property({ type: Number })
  padding = 8

  @property({ type: String })
  position: DockPosition = 'bottom'

  @property({ type: Number })
  size = 40

  @property({ type: Boolean })
  sortable = false

  @property({ type: Boolean, attribute: 'will-change' })
  willChange = false

  get allowDragDeleteValue() {
    return asBoolean(this.allowDragDelete)
  }

  get disabledValue() {
    return asBoolean(this.disabled)
  }

  get gapValue() {
    return asNumber(this.gap)
  }

  get maxRangeValue() {
    return asNumber(this.maxRange)
  }

  get maxScaleValue() {
    return asNumber(this.maxScale)
  }

  get paddingValue() {
    return asNumber(this.padding)
  }

  get sizeValue() {
    return asNumber(this.size)
  }

  get sortableValue() {
    return asBoolean(this.sortable)
  }

  get willChangeValue() {
    return asBoolean(this.willChange)
  }

  connectedCallback(): void {
    super.connectedCallback()
    if (this.hasUpdated)
      this.observe()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    const dragState = this._dragState
    this.cancelDragFrame()
    this.cancelHoverFrame()
    dragState?.preview?.remove()
    dragState?.placeholder.remove()
    if (dragState?.active)
      this.resetDraggedItemStyle(dragState.item)
    this._dragState = null
    this._moving = false
    this._suppressClick = false
    this._ready = false
    this.shadowRoot?.host?.removeEventListener('click', this.onHostClick as EventListener, true)
    this.shadowRoot?.host?.removeEventListener('dragstart', this.onHostDragStart as EventListener)
    this.shadowRoot?.host?.removeEventListener('mouseleave', this.onHostMouseleave as EventListener)
    this.shadowRoot?.host?.removeEventListener('mousemove', this.onHostMousemove as EventListener)
    this.shadowRoot?.host?.removeEventListener('pointerdown', this.onHostPointerDown as EventListener)
    window.removeEventListener('pointermove', this.onWindowPointerMove)
    window.removeEventListener('pointerup', this.onWindowPointerUp)
    window.removeEventListener('pointercancel', this.onWindowPointerUp)
  }

  get className() {
    const names = ['dock-wrapper', this.position, this.direction]
    if (this._moving)
      names.push('moving')
    return names.join(' ')
  }

  get wrapperStyle() {
    const hOrW = this.direction === 'horizontal' ? 'height' : 'width'
    const styles = {
      '--gap': `${this.gapValue}px`,
      '--size': `${this.sizeValue}px`,
      'padding': `${this.paddingValue}px`,
      [hOrW]: `${this.paddingValue * 2 + this.sizeValue}px`,
    }
    return Object.entries(styles)
      .map(([key, value]) => `${key}: ${value}`)
      .join(';')
  }

  render() {
    return html`
      <ul class=${this.className} style="${this.wrapperStyle}">
        <slot @slotchange=${this.onSlotChange}></slot>
      </ul>
    `
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('direction')) {
      this.cancelHoverFrame()
      this._mousePos = { x: 0, y: 0 }
    }
    if (changedProperties.has('disabled') && this.disabledValue) {
      this.cancelHoverFrame()
      this.resetAll()
    }
    if (changedProperties.has('willChange'))
      this.onWillChangeChanged(this.willChangeValue)
    if (['size', 'gap', 'easing', 'direction'].some(key => changedProperties.has(key)))
      this.provideSharedProps()
  }

  private applyHoverScale(
    clientX: number,
    clientY: number,
    measuredItems?: DockItem[],
    measuredRects?: Map<DockItem, DOMRect>,
  ) {
    if (this.disabledValue)
      return

    const { x, y } = this._mousePos
    const offset = this.direction === 'horizontal' ? clientX - x : clientY - y

    if (Math.abs(offset) <= 2)
      return

    this._mousePos = { x: clientX, y: clientY }

    const pointerPosition = this.direction === 'horizontal' ? clientX : clientY
    const items = measuredItems ?? this.getVisibleDockItems()
    const itemRects = items.map((child) => {
      return measuredRects?.get(child) ?? child.getBoundingClientRect()
    })

    items.forEach((child, index) => {
      const childRect = itemRects[index]
      const center = this.direction === 'horizontal'
        ? childRect.left + childRect.width / 2
        : childRect.top + childRect.height / 2
      const itemSize = this.direction === 'horizontal'
        ? child.widthValue
        : child.size
      const scale = calculateHoverScale(
        pointerPosition,
        center,
        itemSize,
        this.maxRangeValue,
        this.maxScaleValue,
      )
      this.setItemScale(child, scale)
    })
  }

  private cancelDragFrame() {
    if (this._dragFrame !== null)
      cancelAnimationFrame(this._dragFrame)
    this._dragFrame = null
    this._pendingDragMove = null
  }

  private cancelHoverFrame() {
    if (this._hoverFrame !== null)
      cancelAnimationFrame(this._hoverFrame)
    this._hoverFrame = null
    this._pendingHoverMove = null
  }

  private flushDragMove() {
    const move = this._pendingDragMove
    this._pendingDragMove = null
    if (!move || move.pointerId !== this._dragState?.pointerId)
      return
    this.processDragMove(move.clientX, move.clientY)
  }

  private processDragMove(clientX: number, clientY: number) {
    const dragState = this._dragState
    if (!dragState?.active)
      return

    const dockRect = this.getBoundingClientRect()
    if (!this.isPointInsideRect(dockRect, clientX, clientY)) {
      this.handleDragOutside()
      this.updateDragPreviewPosition(dragState, clientX, clientY)
      return
    }

    const bounds = this.getDragBlockBounds(dragState, dockRect)
    if (!this.isPointInsideDragBlock(bounds, clientX, clientY)) {
      this.handleDragOutsideBlock()
      this.updateDragPreviewPosition(dragState, clientX, clientY, bounds)
      return
    }

    this.handleDragInside(clientX, clientY)
    this.updateDragPreviewPosition(dragState, clientX, clientY, bounds)
  }

  private queueDragMove(clientX: number, clientY: number, pointerId: number) {
    this._pendingDragMove = { clientX, clientY, pointerId }
    if (this._dragFrame !== null)
      return
    this._dragFrame = requestAnimationFrame(() => {
      this._dragFrame = null
      this.flushDragMove()
    })
  }

  private queueHoverScale(clientX: number, clientY: number) {
    if (this.disabledValue)
      return
    this._pendingHoverMove = { clientX, clientY }
    if (this._hoverFrame !== null)
      return
    this._hoverFrame = requestAnimationFrame(() => {
      this._hoverFrame = null
      const move = this._pendingHoverMove
      this._pendingHoverMove = null
      if (move)
        this.applyHoverScale(move.clientX, move.clientY)
    })
  }

  private animateDragPreviewTo(
    dragState: DragState,
    rect: DOMRect,
    { ease = SNAP_BACK_EASE, onComplete }: { ease?: string; onComplete?: () => void } = {},
  ) {
    const finish = () => {
      if (this._dragState === dragState)
        onComplete?.()
    }

    if (!dragState.preview?.isConnected) {
      finish()
      return
    }

    const previewPosition = dragState.previewPosition ?? {
      left: rect.left,
      top: rect.top,
    }
    const animation = {
      duration: REORDER_DURATION,
      ease,
      scale: [DRAG_SCALE, 1],
      translateX: [previewPosition.left, rect.left],
      translateY: [previewPosition.top, rect.top],
    } as Record<string, unknown>

    if (onComplete)
      animation.onComplete = finish

    animate(dragState.preview, animation as any)
  }

  private animateLayout(items: HTMLElement[], beforeRects: Map<HTMLElement, DOMRect>) {
    const movements = items.flatMap((item) => {
      const before = beforeRects.get(item)
      if (!before || !item.isConnected)
        return []

      const after = item.getBoundingClientRect()
      const deltaX = before.left - after.left
      const deltaY = before.top - after.top
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5)
        return []

      return [{ deltaX, deltaY, item }]
    })

    movements.forEach(({ deltaX, deltaY, item }) => {
      item.style.willChange = 'transform'
      animate(item, {
        duration: REORDER_DURATION,
        ease: REORDER_EASE,
        translateX: [deltaX, 0],
        translateY: [deltaY, 0],
        onComplete: () => item.style.removeProperty('will-change'),
      })
    })
  }

  private beginDrag(dragState: DragState, clientX: number, clientY: number) {
    this.cancelHoverFrame()
    dragState.active = true
    dragState.currentIndex = dragState.originBlockIndex
    this._moving = true

    this.insertBefore(dragState.placeholder, dragState.item)
    this.prepareDraggedItem(dragState)
    dragState.preview = this.createDragPreview(dragState, clientX, clientY)
  }

  private cancelDrag(dragState: DragState) {
    const beforeRects = this.measureLayout(this.getVisibleLayoutChildren())
    this.movePlaceholder(dragState.originBlockIndex, false)
    const targetRect = dragState.placeholder.getBoundingClientRect()
    this.animateLayout(this.getVisibleLayoutChildren(), beforeRects)
    this.updateDraggedItemPosition(dragState, targetRect)
    this.animateDragPreviewTo(dragState, targetRect, {
      onComplete: () => this.restoreDraggedItem(dragState, dragState.originBlockIndex),
    })
  }

  private cleanupAfterDrag() {
    const dragState = this._dragState
    dragState?.preview?.remove()
    this._dragState = null
    this._moving = false
    this._mousePos = { x: 0, y: 0 }
    if (!this._suppressClick)
      return
    queueMicrotask(() => {
      this._suppressClick = false
    })
  }

  private createPlaceholder(originRect: DOMRect) {
    const placeholder = document.createElement('div')
    placeholder.setAttribute('data-dock-placeholder', '')
    Object.assign(placeholder.style, {
      boxSizing: 'border-box',
      display: 'block',
      flex: '0 0 auto',
      height: `${originRect.height}px`,
      opacity: '0',
      pointerEvents: 'none',
      width: `${originRect.width}px`,
    })
    return placeholder
  }

  private createDragPreview(dragState: DragState, clientX: number, clientY: number) {
    const preview = document.createElement('dock-item') as DockItem
    Array.from(dragState.item.attributes).forEach(({ name, value }) => {
      if (name === 'id' || name === 'style')
        return
      preview.setAttribute(name, value)
    })
    Array.from(dragState.item.childNodes).forEach((node) => {
      preview.appendChild(node.cloneNode(true))
    })
    preview.direction = dragState.item.direction
    preview.easing = dragState.item.easing
    preview.gap = dragState.item.gap
    preview.scale = dragState.item.scale
    preview.size = dragState.item.size
    preview.width = dragState.item.width
    preview.setAttribute('aria-hidden', 'true')
    preview.setAttribute('data-dock-preview', '')
    this.disablePreviewAnimations(preview)

    const previewPosition = this.getDragPreviewPosition(dragState, clientX, clientY)
    dragState.previewPosition = previewPosition
    Object.assign(preview.style, {
      animation: 'none',
      boxSizing: 'border-box',
      cursor: 'grabbing',
      height: `${dragState.originRect.height}px`,
      left: '0',
      margin: '0',
      pointerEvents: 'none',
      position: 'fixed',
      top: '0',
      transform: `translateX(${previewPosition.left}px) translateY(${previewPosition.top}px) translateZ(0) scale(${DRAG_SCALE})`,
      transformOrigin: `${dragState.pointerOffset.x}px ${dragState.pointerOffset.y}px`,
      transition: 'none',
      width: `${dragState.originRect.width}px`,
      willChange: 'transform',
      zIndex: '10000',
    })

    document.body.appendChild(preview)
    return preview
  }

  private disablePreviewAnimations(root: ParentNode) {
    const elements: Element[] = []
    if (root instanceof Element)
      elements.push(root)

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
    let current = walker.nextNode()
    while (current) {
      if (current instanceof Element)
        elements.push(current)
      current = walker.nextNode()
    }

    elements.forEach((element) => {
      if (!(element instanceof HTMLElement || element instanceof SVGElement))
        return
      element.style.setProperty('animation', 'none', 'important')
      element.style.setProperty('transition', 'none', 'important')
    })
  }

  private dispatchDelete(dragState: DragState) {
    this.dispatchEvent(new CustomEvent<DockDeleteDetail>('on-delete', {
      bubbles: true,
      composed: true,
      detail: {
        index: dragState.originIndex,
        item: dragState.item,
      },
    }))
  }

  private dispatchSort(dragState: DragState, newIndex: number) {
    if (dragState.originIndex === newIndex)
      return

    this.dispatchEvent(new CustomEvent<DockSortDetail>('on-sort', {
      bubbles: true,
      composed: true,
      detail: {
        item: dragState.item,
        newIndex,
        oldIndex: dragState.originIndex,
      },
    }))
  }

  private finishDelete(dragState: DragState) {
    this.dispatchDelete(dragState)
    if (!dragState.item.isConnected) {
      dragState.placeholder.remove()
      this.resetDraggedItemStyle(dragState.item)
      this.cleanupAfterDrag()
      return
    }

    animate(dragState.item, {
      duration: 160,
      ease: DELETE_EASE,
      opacity: [1, 0],
      scale: [1, 0.9],
      onComplete: () => {
        if (this._dragState !== dragState) {
          this.resetDraggedItemStyle(dragState.item)
          return
        }
        dragState.placeholder.remove()
        this.resetDraggedItemStyle(dragState.item)
        dragState.item.style.display = 'none'
        this.cleanupAfterDrag()
      },
    })

    if (dragState.preview?.isConnected) {
      animate(dragState.preview, {
        duration: 160,
        ease: DELETE_EASE,
        opacity: [1, 0],
        scale: [DRAG_SCALE, 0.9],
      })
    }
  }

  private finishSort(dragState: DragState) {
    const targetRect = dragState.placeholder.getBoundingClientRect()
    this.updateDraggedItemPosition(dragState, targetRect)
    this.animateDragPreviewTo(dragState, targetRect, {
      onComplete: () => this.restoreDraggedItem(dragState, dragState.currentIndex),
    })
  }

  private getDockItemFromEvent(e: Event) {
    return e.composedPath().find((node): node is DockItem => {
      return node instanceof HTMLElement && isDockItemElement(node)
    })
  }

  private getDockItems() {
    return this._children
  }

  private getDockSeparators() {
    return this._layoutChildren.filter(isDockSeparatorElement)
  }

  private getLayoutChildren() {
    return this._layoutChildren
  }

  private getDockBlockForItem(item: DockItem): DockBlock {
    const children = this.getLayoutChildren()
    const itemIndex = children.indexOf(item)
    let startIndex = itemIndex
    while (startIndex > 0 && !isDockSeparatorElement(children[startIndex - 1]))
      startIndex -= 1

    let endIndex = itemIndex + 1
    while (endIndex < children.length && !isDockSeparatorElement(children[endIndex]))
      endIndex += 1

    const nextChild = children[endIndex]
    const previousChild = children[startIndex - 1]
    return {
      items: children.slice(startIndex, endIndex).filter(isDockItemElement),
      nextSeparator: nextChild && isDockSeparatorElement(nextChild) ? nextChild : null,
      previousSeparator: previousChild && isDockSeparatorElement(previousChild) ? previousChild : null,
    }
  }

  private getDragBlockBounds(dragState: DragState, dockRect: DOMRect): DragBlockBounds {
    const previousRect = dragState.block.previousSeparator?.getBoundingClientRect()
    const nextRect = dragState.block.nextSeparator?.getBoundingClientRect()

    return this.direction === 'horizontal'
      ? {
          max: nextRect?.left ?? dockRect.right,
          min: previousRect?.right ?? dockRect.left,
        }
      : {
          max: nextRect?.top ?? dockRect.bottom,
          min: previousRect?.bottom ?? dockRect.top,
        }
  }

  private getDragPreviewPosition(dragState: DragState, clientX: number, clientY: number): DragPreviewPosition {
    return {
      left: clientX - dragState.pointerOffset.x,
      top: clientY - dragState.pointerOffset.y,
    }
  }

  private getConstrainedDragPreviewPosition(
    dragState: DragState,
    clientX: number,
    clientY: number,
    bounds: DragBlockBounds,
  ): DragPreviewPosition {
    const position = this.getDragPreviewPosition(dragState, clientX, clientY)
    const { max, min } = bounds
    const scaleOffset = DRAG_SCALE - 1

    if (this.direction === 'horizontal') {
      const minLeft = min + dragState.pointerOffset.x * scaleOffset + DRAG_BOUNDARY_INSET
      const maxLeft = max
        - dragState.originRect.width
        - (dragState.originRect.width - dragState.pointerOffset.x) * scaleOffset
        - DRAG_BOUNDARY_INSET

      return {
        ...position,
        left: clamp(position.left, minLeft, maxLeft),
      }
    }

    const minTop = min + dragState.pointerOffset.y * scaleOffset + DRAG_BOUNDARY_INSET
    const maxTop = max
      - dragState.originRect.height
      - (dragState.originRect.height - dragState.pointerOffset.y) * scaleOffset
      - DRAG_BOUNDARY_INSET

    return {
      ...position,
      top: clamp(position.top, minTop, maxTop),
    }
  }

  private getInsertionIndex(
    pointerX: number,
    pointerY: number,
    measuredItems?: DockItem[],
    measuredRects?: Map<DockItem, DOMRect>,
  ) {
    const dragState = this._dragState
    const items = measuredItems
      ?? (dragState ? this.getVisibleBlockItems(dragState) : this.getVisibleDockItems())
    if (!items.length)
      return 0

    const pointerValue = this.direction === 'horizontal' ? pointerX : pointerY
    for (const [index, item] of items.entries()) {
      const rect = measuredRects?.get(item) ?? item.getBoundingClientRect()
      const center = this.direction === 'horizontal'
        ? rect.left + rect.width / 2
        : rect.top + rect.height / 2
      if (pointerValue < center)
        return index
    }

    return items.length
  }

  private getVisibleDockItems() {
    const draggedItem = this._dragState?.item
    return this.getDockItems().filter(item => item !== draggedItem && item.style.display !== 'none')
  }

  private getVisibleBlockItems(dragState: DragState) {
    return dragState.block.items.filter(item => item !== dragState.item && item.style.display !== 'none')
  }

  private getVisibleLayoutChildren() {
    const draggedItem = this._dragState?.item
    return this.getLayoutChildren().filter(child => child !== draggedItem && child.style.display !== 'none')
  }

  private handleDragInside(clientX: number, clientY: number) {
    const dragState = this._dragState
    if (!dragState)
      return

    const hoverItems = this.getVisibleDockItems()
    const itemRects = new Map(
      hoverItems.map(item => [item, item.getBoundingClientRect()] as const),
    )
    const insertionIndex = this.getInsertionIndex(
      clientX,
      clientY,
      this.getVisibleBlockItems(dragState),
      itemRects,
    )
    const layoutChanged = dragState.invalid
      || dragState.outside
      || insertionIndex !== dragState.currentIndex

    if (!layoutChanged) {
      this.applyHoverScale(clientX, clientY, hoverItems, itemRects)
      return
    }

    const layoutChildren = this.getVisibleLayoutChildren()
    const beforeRects = this.measureLayout(layoutChildren, itemRects)
    dragState.invalid = false
    dragState.outside = false
    this.movePlaceholder(insertionIndex, false)
    this.animateLayout(layoutChildren, beforeRects)
    this.updateDraggedItemPosition(dragState, dragState.placeholder.getBoundingClientRect())
    this.applyHoverScale(clientX, clientY)
  }

  private handleDragOutside() {
    const dragState = this._dragState
    if (!dragState || dragState.outside)
      return

    const beforeRects = this.measureLayout(this.getVisibleLayoutChildren())
    dragState.invalid = false
    dragState.outside = true
    this.movePlaceholder(dragState.currentIndex, true)
    this.animateLayout(this.getVisibleLayoutChildren(), beforeRects)
    this.resetAll()
  }

  private handleDragOutsideBlock() {
    const dragState = this._dragState
    if (!dragState || dragState.invalid)
      return

    const beforeRects = this.measureLayout(this.getVisibleLayoutChildren())
    dragState.invalid = true
    dragState.outside = false
    this.movePlaceholder(dragState.currentIndex, true)
    this.animateLayout(this.getVisibleLayoutChildren(), beforeRects)
    this.resetAll()
  }

  private isPointInsideRect(rect: DOMRect, clientX: number, clientY: number) {
    return clientX >= rect.left
      && clientX <= rect.right
      && clientY >= rect.top
      && clientY <= rect.bottom
  }

  private isPointInsideDragBlock(bounds: DragBlockBounds, clientX: number, clientY: number) {
    const { max, min } = bounds
    const pointerValue = this.direction === 'horizontal' ? clientX : clientY

    return pointerValue >= min && pointerValue <= max
  }

  private measureLayout(items: HTMLElement[], measuredRects?: Map<DockItem, DOMRect>) {
    return new Map(items.map((item) => {
      const rect = isDockItemElement(item)
        ? measuredRects?.get(item) ?? item.getBoundingClientRect()
        : item.getBoundingClientRect()
      return [item, rect] as const
    }))
  }

  private movePlaceholder(index: number, hidden: boolean) {
    const dragState = this._dragState
    if (!dragState)
      return

    const items = this.getVisibleBlockItems(dragState)
    const display = hidden ? 'none' : 'block'
    if (dragState.placeholder.style.display !== display)
      dragState.placeholder.style.display = display
    dragState.currentIndex = index

    const referenceItem = items[index]
    const referenceNode = referenceItem
      ?? (dragState.block.nextSeparator?.isConnected ? dragState.block.nextSeparator : null)

    if (referenceNode) {
      if (dragState.placeholder.nextSibling !== referenceNode)
        this.insertBefore(dragState.placeholder, referenceNode)
    }
    else if (dragState.placeholder.parentNode !== this || dragState.placeholder.nextSibling !== null) {
      this.appendChild(dragState.placeholder)
    }
  }

  private observe() {
    if (this._ready || isServer)
      return
    this._ready = true
    this.shadowRoot?.host?.addEventListener('click', this.onHostClick as EventListener, true)
    this.shadowRoot?.host?.addEventListener('dragstart', this.onHostDragStart as EventListener)
    this.shadowRoot?.host?.addEventListener('mouseleave', this.onHostMouseleave as EventListener)
    this.shadowRoot?.host?.addEventListener('mousemove', this.onHostMousemove as EventListener)
    this.shadowRoot?.host?.addEventListener('pointerdown', this.onHostPointerDown as EventListener)
  }

  private onSlotChange(e: Event) {
    const nodes = (e.target as HTMLSlotElement).assignedElements({ flatten: true })
    this.syncChildren(nodes)
    this.onWillChangeChanged(this.willChangeValue)
    this.observe()
    this.provideSharedProps()
  }

  private onWillChangeChanged(v: boolean) {
    const value = v ? 'width, height' : 'auto'
    this.getDockItems().forEach((child) => {
      if (child.style.getPropertyValue('--dock-item-will-change') !== value)
        child.style.setProperty('--dock-item-will-change', value)
    })
  }

  private prepareDraggedItem(dragState: DragState) {
    Object.assign(dragState.item.style, {
      boxSizing: 'border-box',
      cursor: 'grabbing',
      height: `${dragState.originRect.height}px`,
      left: `${dragState.originRect.left}px`,
      margin: '0',
      pointerEvents: 'none',
      position: 'fixed',
      top: `${dragState.originRect.top}px`,
      transition: `left ${REORDER_DURATION}ms ${REORDER_EASE}, top ${REORDER_DURATION}ms ${REORDER_EASE}`,
      width: `${dragState.originRect.width}px`,
      zIndex: '9999',
    })
  }

  private provideSharedProps() {
    this.getDockItems().forEach((el) => {
      this.setAttributeIfChanged(el, 'direction', this.direction)
      this.setAttributeIfChanged(el, 'easing', this.easing)
      this.setAttributeIfChanged(el, 'gap', this.gapValue)
      this.setAttributeIfChanged(el, 'size', this.sizeValue)
    })
    this.getDockSeparators().forEach((el) => {
      this.setAttributeIfChanged(el, 'direction', this.direction)
      this.setAttributeIfChanged(el, 'size', this.sizeValue)
    })
  }

  private resetAll() {
    const draggedItem = this._dragState?.item
    this.getDockItems().forEach((child) => {
      if (child.style.display === 'none' || child === draggedItem)
        return
      this.setItemScale(child, 1)
    })
  }

  private setItemScale(item: DockItem, scale: number) {
    if (Math.abs(item.scale - scale) <= 0.0001)
      return
    item.scale = scale
  }

  private setAttributeIfChanged(element: Element, name: string, value: number | string) {
    const nextValue = `${value}`
    if (element.getAttribute(name) !== nextValue)
      element.setAttribute(name, nextValue)
  }

  private resetDraggedItemStyle(item: DockItem) {
    item.style.removeProperty('box-sizing')
    item.style.removeProperty('cursor')
    item.style.removeProperty('display')
    item.style.removeProperty('height')
    item.style.removeProperty('left')
    item.style.removeProperty('margin')
    item.style.removeProperty('opacity')
    item.style.removeProperty('pointer-events')
    item.style.removeProperty('position')
    item.style.removeProperty('top')
    item.style.removeProperty('transform')
    item.style.removeProperty('transform-origin')
    item.style.removeProperty('transition')
    item.style.removeProperty('width')
    item.style.removeProperty('z-index')
  }

  private restoreDraggedItem(dragState: DragState, newIndex: number) {
    const items = this.getVisibleBlockItems(dragState)
    const referenceItem = items[newIndex]
    if (referenceItem)
      this.insertBefore(dragState.item, referenceItem)
    else if (dragState.block.nextSeparator?.isConnected)
      this.insertBefore(dragState.item, dragState.block.nextSeparator)
    else
      this.appendChild(dragState.item)

    this.resetDraggedItemStyle(dragState.item)
    dragState.placeholder.remove()
    this.syncChildren()
    this.dispatchSort(dragState, this.getDockItems().indexOf(dragState.item))
    this.cleanupAfterDrag()
  }

  private syncChildren(elements?: Element[]) {
    const source = elements ?? Array.from(this.children)
    this._layoutChildren = source.filter(isDockLayoutChild)
    this._children = this._layoutChildren.filter(isDockItemElement)
  }

  private updateDragPreviewPosition(
    dragState: DragState,
    clientX: number,
    clientY: number,
    bounds?: DragBlockBounds,
  ) {
    if (!dragState.preview)
      return

    const position = bounds
      ? this.getConstrainedDragPreviewPosition(dragState, clientX, clientY, bounds)
      : this.getDragPreviewPosition(dragState, clientX, clientY)

    dragState.previewPosition = position
    dragState.preview.style.transform = `translateX(${position.left}px) translateY(${position.top}px) translateZ(0) scale(${DRAG_SCALE})`
  }

  private updateDraggedItemPosition(dragState: DragState, rect: Pick<DOMRect, 'left' | 'top'>) {
    dragState.item.style.left = `${rect.left}px`
    dragState.item.style.top = `${rect.top}px`
  }

  static styles = css`
    ul.dock-wrapper {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      list-style: none;
      gap: var(--gap, 5px);
      border-radius: inherit;
      user-select: none;
    }
    ul.dock-wrapper.horizontal.bottom {
      align-items: flex-end;
    }
    ul.dock-wrapper.horizontal.top {
      align-items: flex-start;
    }
    ul.dock-wrapper.vertical.left {
      align-items: flex-start;
    }
    ul.dock-wrapper.vertical.right {
      align-items: flex-end;
    }
    ul.dock-wrapper.left,
    ul.dock-wrapper.right {
      flex-direction: column;
    }
    ul.dock-wrapper.top,
    ul.dock-wrapper.bottom {
      flex-direction: row;
    }
    ul.dock-wrapper.horizontal {
      flex-direction: row;
      max-width: 80vw;
    }
    ul.dock-wrapper.vertical {
      flex-direction: column;
      max-height: 90vh;
    }
    ul.dock-wrapper.horizontal.overflowed {
      overflow-x: auto;
    }
    ul.dock-wrapper.vertical.overflowed {
      overflow-y: auto;
    }
  `
}

declare global {
  interface HTMLElementEventMap {
    'on-delete': CustomEvent<DockDeleteDetail>
    'on-sort': CustomEvent<DockSortDetail>
  }

  interface HTMLElementTagNameMap {
    'dock-wrapper': DockWrapper
  }
}
