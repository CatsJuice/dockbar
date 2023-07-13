import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import anime from 'animejs/lib/anime.es.js'

export type DockPosition = 'top' | 'right' | 'bottom' | 'left'
export type DockDirection = 'horizontal' | 'vertical'

@customElement('dock-wrapper')
export class Dock extends LitElement {
  private _ready = false
  private _children: any[] = []
  private _active = false
  private _mousePos = { x: 0, y: 0 }
  private _moving = false

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
      element.style.setProperty('position', 'relative')
      element.style.setProperty('top', '0')
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
  }

  resetAll() {
    this._children.forEach((child) => {
      anime({
        targets: child,
        width: `${this.size}px`,
        height: `${this.size}px`,
        duration: 100,
      })
    })
  }

  onMouseenter() {}
  onMouseleave() {
    this.resetAll()
    this._active = false
    setTimeout(() => {
      this._active = false
    }, 100)
  }

  onMousemove(e: any) {
    const { clientX, clientY } = e
    const { x, y } = this._mousePos
    const offset = this.direction === 'horizontal' ? clientX - x : clientY - y
    if (Math.abs(offset) <= 10)
      return
    const rect = this.shadowRoot?.host?.getBoundingClientRect()
    if (!rect)
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
        duration: this._active ? 100 : 100,
      })
      setTimeout(() => {
        this._active = true
      }, 100)
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

  get cssVars() {
    const styles = {
      '--gap': `${this.gap}px`,
      '--size': `${this.size}px`,
      '--origin':
        {
          left: 'left center',
          right: 'right center',
          top: 'center top',
          bottom: 'center bottom',
        }[this.position] || 'center',
    }
    return Object.entries(styles)
      .map(([key, value]) => `${key}: ${value}`)
      .join(';')
  }

  render() {
    return html`
      <ul class=${this.className} .style=${this.cssVars}>
        <slot @slotchange=${this.onSlotChange}></slot>
      </ul>
    `
  }

  static styles = css`
    ul.dock-wrapper {
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: nowrap;
      list-style: none;
      align-items: flex-end;
      gap: var(--gap, 5px);
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
    }
    ul.dock-wrapper.vertical {
      flex-direction: column;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'dock-wrapper': Dock
  }
}
