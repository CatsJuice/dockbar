import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import anime from 'animejs/lib/anime.es.js'

export type DockPosition = 'top' | 'right' | 'bottom' | 'left'
export type DockDirection = 'horizontal' | 'vertical'

@customElement('dock-wrapper')
export class Dock extends LitElement {
  private _ready = false
  private _children: any[] = []
  private _mousePos = { x: 0, y: 0 }
  private _moving = false
  private _overflowed = false

  @property({ type: Boolean })
  disabled = false

  @property({ type: Number })
  maxRange = 200

  @property({ type: Number })
  maxScale = 2

  @property({ type: String })
  position: DockPosition = 'bottom'

  @property({ type: String })
  direction: DockDirection = 'horizontal'

  @property({ type: Number })
  size = 40

  @property({ type: Number })
  padding = 8

  @property({ type: Number })
  gap = 5

  constructor() {
    super()
  }

  onSlotChange(e: any) {
    const nodes = e.target.assignedNodes({ flatten: true })
    this._children = nodes.filter(
      (node: any) => node.nodeName.toUpperCase() === 'DOCK-ITEM',
    )
    this._children.forEach((element: any) => {
      element.style.setProperty('width', `${this.size}px`)
      element.style.setProperty('height', `${this.size}px`)
      element.style.setProperty('flex-shrink', '0')
    })
    this.observe()
  }

  observe() {
    if (this._ready)
      return
    this._ready = true
    this.shadowRoot?.host?.addEventListener(
      'mousemove',
      this.onMousemove.bind(this),
    )
    this.shadowRoot?.host?.addEventListener(
      'mouseenter',
      this.onMouseenter.bind(this),
    )
    this.shadowRoot?.host?.addEventListener(
      'mouseleave',
      this.onMouseleave.bind(this),
    )
    window.addEventListener('resize', this.onResize.bind(this))
    this.onResize()
  }

  resetAll() {
    this._children.forEach((child) => {
      anime({
        targets: child,
        width: `${this.size}px`,
        height: `${this.size}px`,
        duration: 100,
        easing: 'cubicBezier(0.33, 1, 0.68, 1)',
      })
    })
  }

  onResize() {
    const side = this.direction === 'horizontal' ? 'right' : 'bottom'
    const lastChildRight = (this.shadowRoot?.host?.lastChild as HTMLElement)?.getBoundingClientRect()?.[side]
    const wrapperRight = this.shadowRoot?.host?.getBoundingClientRect()?.[side]
    this._overflowed = !!wrapperRight && !!wrapperRight && lastChildRight > wrapperRight
    this.renderRoot.querySelector('ul')?.classList?.toggle('overflowed', this._overflowed)
  }

  onMouseenter() {}
  onMouseleave() {
    this.resetAll()
  }

  onMousemove(e: any) {
    const { clientX, clientY } = e
    const { x, y } = this._mousePos
    const offset = this.direction === 'horizontal' ? clientX - x : clientY - y
    if (Math.abs(offset) <= 10)
      return

    const rect = this.shadowRoot?.host?.getBoundingClientRect()
    if (!rect || this.disabled || this._overflowed)
      return

    this._children.forEach((child) => {
      const childRect = child.getBoundingClientRect()
      const { left, top, width, height } = childRect
      const center
        = this.direction === 'horizontal' ? left + width / 2 : top + height / 2
      const distance = Math.abs(
        (this.direction === 'horizontal' ? clientX : clientY) - center,
      )
      const scale
        = distance > this.maxRange
          ? 1
          : 1 + (this.maxScale - 1) * (1 - distance / this.maxRange)
      anime({
        targets: child,
        width: `${this.size * scale}px`,
        height: `${this.size * scale}px`,
        duration: 100,
        easing: 'cubicBezier(0.33, 1, 0.68, 1)',
      })
    })
  }

  get _slottedChildren() {
    return this.shadowRoot
      ?.querySelector('slot')
      ?.assignedNodes({ flatten: true })
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
      '--gap': `${this.gap}px`,
      '--size': `${this.size}px`,
      'padding': `${this.padding}px`,
      [hOrW]: `${this.padding * 2 + this.size}px`,
    }
    return Object.entries(styles)
      .map(([key, value]) => `${key}: ${value}`)
      .join(';')
  }

  render() {
    return html`
      <ul class=${this.className} .style=${this.wrapperStyle}>
        <slot @slotchange=${this.onSlotChange}></slot>
      </ul>
    `
  }

  updated(changedProperties: any) {
    if (changedProperties.has('direction'))
      setTimeout(this.onResize.bind(this))
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
  interface HTMLElementTagNameMap {
    'dock-wrapper': Dock
  }
}
