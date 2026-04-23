import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

export type DockSeparatorDirection = 'horizontal' | 'vertical'

function asNumber(value: number | string) {
  return typeof value === 'number' ? value : Number(value)
}

@customElement('dock-separator')
export class DockSeparator extends LitElement {
  @property({ type: String })
  direction: DockSeparatorDirection = 'horizontal'

  @property({ type: Number })
  size = 40

  @property({ type: Number })
  thickness = 1

  get className() {
    return `${this.direction} dock-separator`
  }

  get orientation() {
    return this.direction === 'horizontal' ? 'vertical' : 'horizontal'
  }

  get separatorStyle() {
    const size = Math.max(0, asNumber(this.size))
    const thickness = Math.max(0, asNumber(this.thickness))
    const styles = this.direction === 'horizontal'
      ? {
          height: `${size}px`,
          width: `${thickness}px`,
        }
      : {
          height: `${thickness}px`,
          width: `${size}px`,
        }

    return Object.entries(styles)
      .map(([key, value]) => `${key}: ${value}`)
      .join(';')
  }

  render() {
    return html`
      <li
        aria-orientation=${this.orientation}
        class=${this.className}
        role="separator"
        style=${this.separatorStyle}
      >
        <span class="dock-separator__line"></span>
      </li>
    `
  }

  static styles = css`
    :host {
      display: block;
      flex: 0 0 auto;
    }
    li.dock-separator {
      align-items: center;
      box-sizing: border-box;
      display: flex;
      justify-content: center;
      list-style: none;
      margin: 0;
      padding: 0;
      position: relative;
    }
    .dock-separator__line {
      background: var(--dock-separator-color, rgba(255, 255, 255, 0.38));
      border-radius: 999px;
      display: block;
    }
    li.horizontal .dock-separator__line {
      height: 72%;
      width: 100%;
    }
    li.vertical .dock-separator__line {
      height: 100%;
      width: 72%;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'dock-separator': DockSeparator
  }
}
