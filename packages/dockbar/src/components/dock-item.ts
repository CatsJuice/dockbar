import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { createAnimatable } from 'animejs'
import type { AnimatableObject, AnimatableParams } from 'animejs'

const RESIZE_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

@customElement('dock-item')
export class DockItem extends LitElement {
  private readonly _animatedGeometry = {
    width: 40,
    height: 40,
    scale: 1,
  }

  private _scale = 1
  private _scaleAnimation: AnimatableObject | null = null
  private _scaleElement: HTMLElement | null = null
  private _sizeElement: HTMLElement | null = null
  private _targetHeight = 40
  private _targetWidth = 40

  @property({ type: Number })
  size = 40

  @property({ type: Number })
  width?: number

  @property({ type: Number })
  height?: number

  @property({ type: Number, attribute: 'resize-duration' })
  resizeDuration = 200

  @property({ type: Number, attribute: 'resize-exit-duration' })
  resizeExitDuration = 160

  @property({ type: String, attribute: 'resize-ease' })
  resizeEase = RESIZE_EASE

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

  get heightValue() {
    return typeof this.height === 'number' && Number.isFinite(this.height) && this.height > 0
      ? this.height
      : this.size
  }

  get sizeStyle() {
    const styleObj = {
      width: `${this.widthValue}px`,
      height: `${this.heightValue}px`,
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
    return `${this.animatedOuterSizeStyle};${this.gapStyle}`
  }

  get animatedOuterSizeStyle() {
    return `width: ${this._animatedGeometry.width * this._animatedGeometry.scale}px;height: ${this._animatedGeometry.height * this._animatedGeometry.scale}px;`
  }

  get animatedContentSizeStyle() {
    return `width: ${this._animatedGeometry.width}px;height: ${this._animatedGeometry.height}px;transform: scale(${this._animatedGeometry.scale});`
  }

  override get className() {
    return `${this.direction} dock-item`
  }

  override render() {
    return html`
      <li class=${this.className} style=${this.liStyle}>
        <div class="dock-item__pos">
          <div class="dock-item__scale" style=${this.animatedContentSizeStyle}>
            <slot></slot>
          </div>
        </div>
        <div class="dock-item__indicator" part="indicator">
          <slot name="indicator"></slot>
        </div>
      </li>
    `
  }

  override firstUpdated() {
    this._sizeElement = this.shadowRoot?.querySelector<HTMLElement>('.dock-item') ?? null
    this._scaleElement = this.shadowRoot?.querySelector<HTMLElement>('.dock-item__scale') ?? null
  }

  override willUpdate() {
    if (this.hasUpdated)
      return

    this._animatedGeometry.width = this.widthValue
    this._animatedGeometry.height = this.heightValue
    this._animatedGeometry.scale = this.scale
    this._targetWidth = this.widthValue
    this._targetHeight = this.heightValue
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (
      changedProperties.has('size')
      || changedProperties.has('width')
      || changedProperties.has('height')
    )
      this.onScaleChanged(this.scale)
  }

  get animationEase() {
    return this.normalizeEase(this.easing, 'linear')
  }

  get resizeAnimationEase() {
    return this.normalizeEase(this.resizeEase, RESIZE_EASE)
  }

  get resizeDurationValue() {
    return Number.isFinite(this.resizeDuration) && this.resizeDuration >= 0
      ? this.resizeDuration
      : 200
  }

  get resizeExitDurationValue() {
    return Number.isFinite(this.resizeExitDuration) && this.resizeExitDuration >= 0
      ? this.resizeExitDuration
      : 160
  }

  private normalizeEase(easing: string, fallback: string) {
    const value = typeof easing === 'string' && easing.trim() ? easing.trim() : fallback

    if (value.startsWith('cubicBezier('))
      return value.replace('cubicBezier(', 'cubic-bezier(')

    if (value.startsWith('ease') && value.length > 4) {
      const name = value.slice(4)
      return `${name.slice(0, 1).toLowerCase()}${name.slice(1)}`
    }

    return value
  }

  get isPreview() {
    return this.hasAttribute('data-dock-preview')
  }

  get previewSizeStyle() {
    return `width: ${this.widthValue * this.scale}px;height: ${this.heightValue * this.scale}px;`
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

    const nextWidth = this.widthValue
    const nextHeight = this.heightValue
    const widthChanged = !Object.is(nextWidth, this._targetWidth)
    const heightChanged = !Object.is(nextHeight, this._targetHeight)
    const isExpanding = nextWidth > this._targetWidth || nextHeight > this._targetHeight
    const resizeDuration = isExpanding
      ? this.resizeDurationValue
      : this.resizeExitDurationValue

    this._targetWidth = nextWidth
    this._targetHeight = nextHeight

    if (!this._scaleAnimation) {
      const animationParameters = {
        width: { duration: this.resizeDurationValue },
        height: { duration: this.resizeDurationValue },
        scale: { duration: 100 },
        onRender: () => {
          const { width, height, scale: animatedScale } = this._animatedGeometry
          sizeEl.style.width = `${width * animatedScale}px`
          sizeEl.style.height = `${height * animatedScale}px`
          scaleEl.style.width = `${width}px`
          scaleEl.style.height = `${height}px`
          scaleEl.style.transform = `scale(${animatedScale})`
        },
      } as unknown as AnimatableParams
      this._scaleAnimation = createAnimatable(this._animatedGeometry, animationParameters)
    }

    if (widthChanged)
      this._scaleAnimation.width!(nextWidth, resizeDuration, this.resizeAnimationEase)
    if (heightChanged)
      this._scaleAnimation.height!(nextHeight, resizeDuration, this.resizeAnimationEase)
    this._scaleAnimation.scale!(scale, 100, this.animationEase)
  }

  static override styles = css`
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
    .dock-item__indicator {
      position: absolute;
      inset: 0;
      pointer-events: none;
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
