import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { animate } from 'animejs'
import type { DockItem } from './dock-item'

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

interface DragState {
  active: boolean
  currentIndex: number
  item: DockItem
  originIndex: number
  originRect: DOMRect
  outside: boolean
  placeholder: HTMLDivElement
  preview: DockItem | null
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

const DRAG_START_DISTANCE = 6
const DRAG_SCALE = 1.08
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

@customElement('dock-wrapper')
export class DockWrapper extends LitElement {
  private _children: DockItem[] = []
  private _dragState: DragState | null = null
  private _mousePos = { x: 0, y: 0 }
  private _moving = false
  private _overflowed = false
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

  private readonly onHostMouseenter = () => {}

  private readonly onHostMouseleave = () => {
    this.resetAll()
  }

  private readonly onHostMousemove = (e: MouseEvent) => {
    if (this._dragState?.active)
      return
    this.applyHoverScale(e.clientX, e.clientY)
  }

  private readonly onHostPointerDown = (e: PointerEvent) => {
    if (!this.sortableValue || this.disabledValue || e.button !== 0)
      return

    const item = this.getDockItemFromEvent(e)
    if (!item)
      return

    const originRect = item.getBoundingClientRect()
    this._dragState = {
      active: false,
      currentIndex: this.getDockItems().indexOf(item),
      item,
      originIndex: this.getDockItems().indexOf(item),
      originRect,
      outside: false,
      placeholder: this.createPlaceholder(originRect),
      preview: null,
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
    this.updateDragPreviewPosition(dragState, e.clientX, e.clientY)

    const dockRect = this.getBoundingClientRect()
    const insideDock = this.isPointInsideRect(dockRect, e.clientX, e.clientY)

    if (!insideDock) {
      this.handleDragOutside()
      return
    }

    this.handleDragInside(e.clientX, e.clientY)
  }

  private readonly onWindowPointerUp = (e: PointerEvent) => {
    const dragState = this._dragState
    if (!dragState || e.pointerId !== dragState.pointerId)
      return

    window.removeEventListener('pointermove', this.onWindowPointerMove)
    window.removeEventListener('pointerup', this.onWindowPointerUp)
    window.removeEventListener('pointercancel', this.onWindowPointerUp)

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

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this._dragState?.preview?.remove()
    this.shadowRoot?.host?.removeEventListener('click', this.onHostClick as EventListener, true)
    this.shadowRoot?.host?.removeEventListener('dragstart', this.onHostDragStart as EventListener)
    this.shadowRoot?.host?.removeEventListener('mouseenter', this.onHostMouseenter as EventListener)
    this.shadowRoot?.host?.removeEventListener('mouseleave', this.onHostMouseleave as EventListener)
    this.shadowRoot?.host?.removeEventListener('mousemove', this.onHostMousemove as EventListener)
    this.shadowRoot?.host?.removeEventListener('pointerdown', this.onHostPointerDown as EventListener)
    window.removeEventListener('pointermove', this.onWindowPointerMove)
    window.removeEventListener('pointerup', this.onWindowPointerUp)
    window.removeEventListener('pointercancel', this.onWindowPointerUp)
    window.removeEventListener('resize', this.onResize)
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
    if (changedProperties.has('direction'))
      setTimeout(this.onResize)
    if (changedProperties.has('willChange'))
      this.onWillChangeChanged(this.willChangeValue)
    if (['size', 'gap', 'easing', 'direction'].some(key => changedProperties.has(key)))
      this.provideSharedProps()
  }

  private applyHoverScale(clientX: number, clientY: number) {
    const { x, y } = this._mousePos
    const offset = this.direction === 'horizontal' ? clientX - x : clientY - y
    this._mousePos = { x: clientX, y: clientY }

    if (Math.abs(offset) <= 2)
      return

    const rect = this.getBoundingClientRect()
    if (!rect || this.disabledValue || this._overflowed)
      return

    this.getVisibleDockItems().forEach((child) => {
      const childRect = child.getBoundingClientRect()
      const center = this.direction === 'horizontal'
        ? childRect.left + childRect.width / 2
        : childRect.top + childRect.height / 2
      const distance = Math.abs(
        (this.direction === 'horizontal' ? clientX : clientY) - center,
      )
      const scale = distance > this.maxRangeValue
        ? 1
        : 1 + (this.maxScaleValue - 1) * (1 - distance / this.maxRangeValue)
      child.setAttribute('scale', `${scale}`)
    })
  }

  private animateDragPreviewTo(
    dragState: DragState,
    rect: DOMRect,
    { ease = SNAP_BACK_EASE, onComplete }: { ease?: string; onComplete?: () => void } = {},
  ) {
    if (!dragState.preview?.isConnected) {
      onComplete?.()
      return
    }

    const animation = {
      duration: REORDER_DURATION,
      ease,
      left: `${rect.left}px`,
      scale: [DRAG_SCALE, 1],
      top: `${rect.top}px`,
    } as Record<string, unknown>

    if (onComplete)
      animation.onComplete = onComplete

    animate(dragState.preview, animation as any)
  }

  private animateLayout(items: HTMLElement[], beforeRects: Map<HTMLElement, DOMRect>) {
    items.forEach((item) => {
      const before = beforeRects.get(item)
      if (!before || !item.isConnected)
        return

      const after = item.getBoundingClientRect()
      const deltaX = before.left - after.left
      const deltaY = before.top - after.top
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5)
        return

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
    dragState.active = true
    dragState.currentIndex = dragState.originIndex
    this._moving = true

    this.insertBefore(dragState.placeholder, dragState.item)
    this.prepareDraggedItem(dragState)
    dragState.preview = this.createDragPreview(dragState, clientX, clientY)
  }

  private cancelDrag(dragState: DragState) {
    const beforeRects = this.measureLayout(this.getVisibleDockItems())
    this.movePlaceholder(dragState.originIndex, false)
    const targetRect = dragState.placeholder.getBoundingClientRect()
    this.animateLayout(this.getVisibleDockItems(), beforeRects)
    this.updateDraggedItemPosition(dragState, targetRect)
    this.animateDragPreviewTo(dragState, targetRect, {
      onComplete: () => this.restoreDraggedItem(dragState, dragState.originIndex),
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
    preview.setAttribute('aria-hidden', 'true')
    preview.setAttribute('data-dock-preview', '')
    this.disablePreviewAnimations(preview)

    Object.assign(preview.style, {
      animation: 'none',
      boxSizing: 'border-box',
      cursor: 'grabbing',
      height: `${dragState.originRect.height}px`,
      left: `${clientX - dragState.pointerOffset.x}px`,
      margin: '0',
      pointerEvents: 'none',
      position: 'fixed',
      top: `${clientY - dragState.pointerOffset.y}px`,
      transform: `scale(${DRAG_SCALE})`,
      transformOrigin: `${dragState.pointerOffset.x}px ${dragState.pointerOffset.y}px`,
      transition: 'none',
      width: `${dragState.originRect.width}px`,
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
      this.cleanupAfterDrag()
      return
    }

    animate(dragState.item, {
      duration: 160,
      ease: DELETE_EASE,
      opacity: [1, 0],
      scale: [1, 0.9],
      onComplete: () => {
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
      return node instanceof HTMLElement && node.nodeName.toUpperCase() === 'DOCK-ITEM'
    })
  }

  private getDockItems() {
    this.syncChildren()
    return this._children
  }

  private getInsertionIndex(pointerX: number, pointerY: number) {
    const items = this.getVisibleDockItems()
    if (!items.length)
      return 0

    const pointerValue = this.direction === 'horizontal' ? pointerX : pointerY
    for (const [index, item] of items.entries()) {
      const rect = item.getBoundingClientRect()
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

  private handleDragInside(clientX: number, clientY: number) {
    const dragState = this._dragState
    if (!dragState)
      return

    const beforeRects = this.measureLayout(this.getVisibleDockItems())
    dragState.outside = false
    this.movePlaceholder(this.getInsertionIndex(clientX, clientY), false)
    this.animateLayout(this.getVisibleDockItems(), beforeRects)
    this.updateDraggedItemPosition(dragState, dragState.placeholder.getBoundingClientRect())
    this.applyHoverScale(clientX, clientY)
  }

  private handleDragOutside() {
    const dragState = this._dragState
    if (!dragState || dragState.outside)
      return

    const beforeRects = this.measureLayout(this.getVisibleDockItems())
    dragState.outside = true
    this.movePlaceholder(dragState.currentIndex, true)
    this.animateLayout(this.getVisibleDockItems(), beforeRects)
    this.resetAll()
  }

  private isPointInsideRect(rect: DOMRect, clientX: number, clientY: number) {
    return clientX >= rect.left
      && clientX <= rect.right
      && clientY >= rect.top
      && clientY <= rect.bottom
  }

  private measureLayout(items: DockItem[]) {
    return new Map(items.map(item => [item, item.getBoundingClientRect()] as const))
  }

  private movePlaceholder(index: number, hidden: boolean) {
    const dragState = this._dragState
    if (!dragState)
      return

    const items = this.getVisibleDockItems()
    dragState.currentIndex = index
    dragState.placeholder.style.display = hidden ? 'none' : 'block'

    const referenceItem = items[index]
    if (referenceItem)
      this.insertBefore(dragState.placeholder, referenceItem)
    else
      this.appendChild(dragState.placeholder)
  }

  private observe() {
    if (this._ready || isServer)
      return
    this._ready = true
    this.shadowRoot?.host?.addEventListener('click', this.onHostClick as EventListener, true)
    this.shadowRoot?.host?.addEventListener('dragstart', this.onHostDragStart as EventListener)
    this.shadowRoot?.host?.addEventListener('mouseenter', this.onHostMouseenter as EventListener)
    this.shadowRoot?.host?.addEventListener('mouseleave', this.onHostMouseleave as EventListener)
    this.shadowRoot?.host?.addEventListener('mousemove', this.onHostMousemove as EventListener)
    this.shadowRoot?.host?.addEventListener('pointerdown', this.onHostPointerDown as EventListener)
    window.addEventListener('resize', this.onResize)
    this.onResize()
  }

  private readonly onResize = () => {
    // TODO: not working when html is formatted
    // const side = this.direction === 'horizontal' ? 'right' : 'bottom'
    // const lastChildRight = (this.shadowRoot?.host?.lastChild as HTMLElement)?.getBoundingClientRect()?.[side]
    // const wrapperRight = this.shadowRoot?.host?.getBoundingClientRect()?.[side]
    // this._overflowed = !!wrapperRight && !!wrapperRight && lastChildRight > wrapperRight
    // this.renderRoot.querySelector('ul')?.classList?.toggle('overflowed', this._overflowed)
  }

  private onSlotChange(e: Event) {
    const nodes = (e.target as HTMLSlotElement).assignedElements({ flatten: true })
    this.syncChildren(nodes)
    this.onWillChangeChanged(this.willChangeValue)
    this.observe()
    this.provideSharedProps()
  }

  private onWillChangeChanged(v: boolean) {
    this.getDockItems().forEach((child) => {
      child.style.setProperty('will-change', v ? 'width, height' : 'none')
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
      el.setAttribute('direction', `${this.direction}`)
      el.setAttribute('easing', `${this.easing}`)
      el.setAttribute('gap', `${this.gapValue}`)
      el.setAttribute('size', `${this.sizeValue}`)
    })
  }

  private resetAll() {
    const draggedItem = this._dragState?.item
    this.getDockItems().forEach((child) => {
      if (child.style.display === 'none' || child === draggedItem)
        return
      child.setAttribute('scale', '1')
    })
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
    const items = this.getVisibleDockItems()
    const referenceItem = items[newIndex]
    if (referenceItem)
      this.insertBefore(dragState.item, referenceItem)
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
    this._children = source.filter((node): node is DockItem => node.nodeName.toUpperCase() === 'DOCK-ITEM')
  }

  private updateDragPreviewPosition(dragState: DragState, clientX: number, clientY: number) {
    if (!dragState.preview)
      return

    dragState.preview.style.left = `${clientX - dragState.pointerOffset.x}px`
    dragState.preview.style.top = `${clientY - dragState.pointerOffset.y}px`
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
