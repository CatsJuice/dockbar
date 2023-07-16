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

  get liStyle() {
    const styleObj = {
      width: `${this.size}px`,
      height: `${this.size}px`,
    }
    return Object.entries(styleObj).reduce((acc, [key, value]) => {
      acc += `${key}: ${value};`
      return acc
    }, '')
  }

  render() {
    return html`
      <li class="dock-item">
        <div class="dock-item__scale" style=${this.liStyle}>
          <slot></slot>
        </div>
      </li>
    `
  }

  updated(changedProperties: any) {
    if (changedProperties.has('scale'))
      this.onScaleChanged(this.scale)
  }

  onScaleChanged(scale: number) {
    anime({
      targets: this.shadowRoot?.querySelector('.dock-item__scale'),
      scale,
      duration: 100,
      easing: this.easing,
    })
  }

  static styles = css`
    li.dock-item {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translateX(-50%) translateY(-50%) scale(var(--scale, 1));
    }
    .dock-item__scale {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'dock-item': DockItem
  }
}
