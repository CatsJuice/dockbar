<!-- Logo -->
<p align="center">
  <img height="100" src="https://dock.oooo.so/dockbar.svg">
</p>

<!-- Bridge -->
<h2 align="center">dockbar</h2>
<!-- Description -->
<p align="center">
  A macOS like dockbar component made with <a href="https://developer.mozilla.org/en-US/docs/Web/Web_Components">Web Components</a>
  <br>
  that can be used in any framework.
</p>
<p align="center">
  <img src="https://img.shields.io/npm/l/dockbar"/>
  <img src="https://img.shields.io/npm/dw/dockbar"/>
  <img src="https://img.shields.io/npm/v/dockbar"/>
</p>

<!-- <p align="center">
  <a href="./docs/README.zh.md"> 
    <img src="https://img.shields.io/badge/language_%E4%B8%AD%E6%96%87-blue"/>
  </a>
</p>

<p align="center">
  <a href="https://cursor.oooo.so">
    <img src="./playground/public/screenshot.gif" />
  </a>
</p> -->

---

## Install

- **NPM**
  
  ```bash
  npm install dockbar --save
  ```

- **CDN**

  ESM([Example](./examples/esm/index.html))
  
  ```html
  <head>
    <script type="module" src="https://unpkg.com/dockbar@latest/dockbar.js"></script>
  </head>
  ```

  IIFE([Example](./examples/iife/index.html))

  ```html
  <head>
    <script src="https://unpkg.com/dockbar@latest/dockbar.iife.js"></script>
  </head>
  ```

  Go to [Codepen](https://codepen.io/catsjuice/pen/GRwQdza) for a quick try.

## Usage

### Basic usage

```html
<body>
  <dock-wrapper>
    <dock-item>1</dock-item>
    <dock-item>2</dock-item>
    <dock-item>3</dock-item>
    <dock-item>4</dock-item>
  </dock-wrapper>
</body>
```

It is recommended to use a custom element inside `dock-item`, so that you can customize the content of `dock-item`.

```html
<dock-wrapper>
  <dock-item>
    <div class="my-element"></div>
  </dock-item>
</dock-wrapper>
```

Set `width` on an individual `dock-item` when that item should be wider than the shared `size`.

```html
<dock-wrapper size="40">
  <dock-item>1</dock-item>
  <dock-item width="96">Search</dock-item>
  <dock-item>3</dock-item>
</dock-wrapper>
```

You may need to look at docs if you are using a framework like Vue.js or React.
- [Using Custom Elements in Vue](https://vuejs.org/guide/extras/web-components.html#using-custom-elements-in-vue)
- [Custom HTML Elements in React](https://react.dev/reference/react-dom/components#custom-html-elements)

### Custom Style

Apply `class` to `dock-wrapper` and `dock-item` and customize your own style.

For more, see [Configuration](#configuration).

### Sortable dock

Set `sortable` to enable drag reordering. Set `allow-drag-delete` if dropping an item outside the dock should emit a delete event instead of snapping back.

```html
<dock-wrapper id="dock" sortable allow-drag-delete>
  <dock-item data-id="launchpad">Launchpad</dock-item>
  <dock-item data-id="mail">Mail</dock-item>
  <dock-item data-id="music">Music</dock-item>
</dock-wrapper>

<script>
  const dock = document.querySelector('#dock')

  dock.addEventListener('on-sort', (event) => {
    const { oldIndex, newIndex } = event.detail
    console.log('sort', oldIndex, newIndex)
  })

  dock.addEventListener('on-delete', (event) => {
    const { index, item } = event.detail
    console.log('delete', index, item.dataset.id)
  })
</script>
```


## Problems

There are some problems yet to be solved:

- [ ] SSR compatibility
  It does not work will in SSR framework like Nuxt.js. For now you have to render it inside `ClientOnly`, and import component asynchronously.
- [ ] Style asynchronous loading causes a flash on init
  If you are not using by `iife`, it may cause a flash on init, because the style is loaded asynchronously. For now you could resolve this by applying a style:
  ```html
  <head>
    #dock {
      visibility: hidden;
    }
    #dock:defined {
      visibility: visible;
    }
  </head>
  <body>
    <dock-wrapper id="dock">

    </dock-wrapper>
  </body>
  ```

## Configuration

| Property | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `size` | `number` | `40` | The base height of `dock-item` and fallback width in `px`, see [Sizes](#sizes) |
| `width` | `number` | `size` | Optional per-`dock-item` base width in `px` |
| `padding` | `number` | `8` | The padding of `dock-wrapper` in `px`, see [Sizes](#sizes) |
| `gap` | `number` | `8` | The gap between `dock-item`s in `px`, see [Sizes](#sizes) |
| `maxScale` | `number` | `2` | The max scale of `dock-item`, see [Sizes](#sizes) |
| `maxRange` | `number` | `200` | The max hover range in `px` that participates in the scale effect |
| `disabled` | `boolean` | `false` | Disable the hover scale effect |
| `direction` | `horizontal` \| `vertical` | `horizontal` | The layout direction of `dock-item`s |
| `position` | `top` \| `bottom` \| `left` \| `right` | `bottom` | The dock position, which affects the scale origin |
| `easing` | `string` | `cubic-bezier(0, 0.55, 0.45, 1)` | The easing used by dock-item scale animation |
| `sortable` | `boolean` | `false` | Enable drag reordering for dock items |
| `allow-drag-delete` | `boolean` | `false` | When `sortable` is enabled, allow dropping an item outside the dock to emit a delete event |
| `will-change` | `boolean` | `false` | Apply `will-change` hints to dock items for width and height |

## Events

### `on-sort`

Emitted after a sortable drag ends with a changed order.

```ts
type DockSortDetail = {
  item: HTMLElement
  oldIndex: number
  newIndex: number
}
```

### `on-delete`

Emitted when `allow-drag-delete` is enabled and an item is released outside the dock.

```ts
type DockDeleteDetail = {
  item: HTMLElement
  index: number
}
```

The component only emits the event. Removing the item from your application state is the responsibility of the parent app.


### Sizes

![customize sizes](https://dock.oooo.so/prop-desc.svg)
