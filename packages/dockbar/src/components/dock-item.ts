import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { animate } from 'animejs'

@customElement('dock-item')
export class DockItem extends LitElement {
  @property({ type: Number })
  size = 40

  @property({ type: String })
  easing = 'linear'

  @property({ type: Number })
  scale = 1

  @property({ type: Number })
  gap = 8

  @property({ type: String })
  direction = 'horizontal'

  get sizeStyle() {
    const styleObj = {
      width: `${this.size}px`,
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

  updated(changedProperties: any) {
    if (changedProperties.has('scale'))
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
    const previewSize = this.size * this.scale
    return `width: ${previewSize}px;height: ${previewSize}px;`
  }

  onScaleChanged(scale: number) {
    const sizeEl = this.shadowRoot?.querySelector('.dock-item')
    const scaleEl = this.shadowRoot?.querySelector('.dock-item__scale')
    if (!sizeEl || !scaleEl)
      return

    if (this.isPreview) {
      sizeEl.setAttribute('style', `${this.previewSizeStyle};${this.gapStyle}`)
      scaleEl.setAttribute('style', `${this.sizeStyle};transform: scale(${scale});`)
      return
    }

    animate(sizeEl, {
      width: `${this.size * scale}px`,
      height: `${this.size * scale}px`,
      duration: 100,
      ease: this.animationEase,
    })
    animate(scaleEl, {
      scale,
      duration: 100,
      ease: this.animationEase,
    })
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
