import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { createAnimatable } from 'animejs'
import type { AnimatableObject, AnimatableParams } from 'animejs'

@customElement('dock-item')
export class DockItem extends LitElement {
  private readonly _animatedScale = { value: 1 }
  private _scale = 1
  private _scaleAnimation: AnimatableObject | null = null
  private _scaleElement: HTMLElement | null = null
  private _sizeElement: HTMLElement | null = null

  @property({ type: Number })
  size = 40

  @property({ type: Number })
  width?: number

  @property({ type: String })
  easing = 'linear'

  @property({ type: Number, noAccessor: true })
  get scale() {
    return this._scale
  }

  set scale(value: number) {
    const nextScale = Number(value)
    if (!Number.isFinite(nextScale) || Object.is(nextScale, this._scale))
      return

    this._scale = nextScale
    if (this.hasUpdated)
      this.onScaleChanged(nextScale)
  }

  @property({ type: Number })
  gap = 8

  @property({ type: String })
  direction = 'horizontal'

  get widthValue() {
    return typeof this.width === 'number' && Number.isFinite(this.width) && this.width > 0
      ? this.width
      : this.size
  }

  get sizeStyle() {
    const styleObj = {
      width: `${this.widthValue}px`,
      height: `${this.size}px`,
    }
    return Object.entries(styleObj).reduce((acc, [key, value]) => {
      acc += `${key}: ${value};`
      return acc
    }, '')
  }

  get gapStyle() {
    return `--gap: ${this.gap}px`
  }

  get liStyle() {
    return `${this.sizeStyle};${this.gapStyle}`
  }

  get className() {
    return `${this.direction} dock-item`
  }

  render() {
    return html`
      <li class=${this.className} style=${this.liStyle}>
        <div class="dock-item__pos">
          <div class="dock-item__scale" style=${this.sizeStyle}>
            <slot></slot>
          </div>
        </div>
      </li>
    `
  }

  firstUpdated() {
    this._sizeElement = this.shadowRoot?.querySelector<HTMLElement>('.dock-item') ?? null
    this._scaleElement = this.shadowRoot?.querySelector<HTMLElement>('.dock-item__scale') ?? null
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('size') || changedProperties.has('width'))
      this.onScaleChanged(this.scale)
  }

  get animationEase() {
    if (this.easing.startsWith('cubicBezier('))
      return this.easing.replace('cubicBezier(', 'cubic-bezier(')

    if (this.easing.startsWith('ease') && this.easing.length > 4) {
      const name = this.easing.slice(4)
      return `${name.slice(0, 1).toLowerCase()}${name.slice(1)}`
    }

    return this.easing
  }

  get isPreview() {
    return this.hasAttribute('data-dock-preview')
  }

  get previewSizeStyle() {
    return `width: ${this.widthValue * this.scale}px;height: ${this.size * this.scale}px;`
  }

  onScaleChanged(scale: number) {
    const sizeEl = this._sizeElement
    const scaleEl = this._scaleElement
    if (!sizeEl || !scaleEl)
      return

    if (this.isPreview) {
      sizeEl.setAttribute('style', `${this.previewSizeStyle};${this.gapStyle}`)
      scaleEl.setAttribute('style', `${this.sizeStyle};transform: scale(${scale});`)
      return
    }

    if (!this._scaleAnimation) {
      const animationParameters = {
        value: { duration: 100 },
        onRender: () => {
          const animatedScale = this._animatedScale.value
          sizeEl.style.width = `${this.widthValue * animatedScale}px`
          sizeEl.style.height = `${this.size * animatedScale}px`
          scaleEl.style.transform = `scale(${animatedScale})`
        },
      } as unknown as AnimatableParams
      this._scaleAnimation = createAnimatable(this._animatedScale, animationParameters)
    }

    this._scaleAnimation.value(scale, 100, this.animationEase)
  }

  static styles = css`
    :host {
      display: block;
      flex: 0 0 auto;
    }
    li.dock-item {
      list-style: none;
      margin: 0;
      padding: 0;
      position: relative;
      will-change: var(--dock-item-will-change, auto);
    }
    li.dock-item .dock-item__pos {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translateX(-50%) translateY(-50%) scale(var(--scale, 1));
    }
    li::before,
    li::after {
      content: "";
      position: absolute;
      /* For debug */
      /* background: red; */
    }
    li.horizontal::before,
    li.horizontal::after {
      width: var(--gap, 0px);
      height: 100%;
      top: 0;
    }
    li.horizontal::before {
      right: 100%
    }
    li.horizontal::after {
      left: 100%;
    }
    li.vertical::before,
    li.vertical::after {
      width: 100%;
      height: var(--gap, 0px);
      left: 0;
    }
    li.vertical::before {
      bottom: 100%;
    }
    li.vertical::after {
      top: 100%;
    }
    .dock-item__scale {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .dock-item__scale > ::slotted(*) {
      width: 100%;
      height: 100%;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'dock-item': DockItem
  }
}
