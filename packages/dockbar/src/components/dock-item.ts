import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import anime from 'animejs/lib/anime.es.js'

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

  render() {
    return html`
      <li class="dock-item" style=${this.liStyle}>
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

  onScaleChanged(scale: number) {
    const sizeEl = this.shadowRoot?.querySelector('.dock-item')
    const scaleEl = this.shadowRoot?.querySelector('.dock-item__scale')
    anime({
      targets: sizeEl,
      width: `${this.size * scale}px`,
      height: `${this.size * scale}px`,
      duration: 100,
      easing: this.easing,
    })
    anime({
      targets: scaleEl,
      scale,
      duration: 100,
      easing: this.easing,
    })
  }

  static styles = css`
    li.dock-item {
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
      width: var(--gap, 0px);
      height: 100%;
      position: absolute;
      top: 0;
      /* For debug */
      /* background: red; */
    }
    li::before {
      right: 100%
    }
    li::after {
      left: 100%;
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
