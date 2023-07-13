import { LitElement, css, html } from 'lit'
import { customElement } from 'lit/decorators.js'

@customElement('dock-item')
export class DockItem extends LitElement {
  render() {
    return html`
      <li class="dock-item">
        <slot></slot>
      </li>
    `
  }

  static styles = css`
    li.dock-item {
      width: 100%;
      height: 100%;
    }
  `
}
