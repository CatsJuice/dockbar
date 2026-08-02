# Dockbar Architecture and Implementation Notes

## Purpose

This document explains how the repository is organized, how the publishable `dockbar` library works internally, how the playground/demo application is assembled, and where the current implementation has intentional or accidental gaps.

It is meant for contributors and agents who need repo-level context beyond the public usage guide in `README.md`.

## Repository Overview

This repository is a pnpm workspace with three main concerns:

1. `packages/dockbar`
   The publishable library. It exposes three custom elements, `dock-wrapper`, `dock-item`, and `dock-separator`, implemented with Lit and animated with Anime.js.

2. `packages/playground`
   The showcase and experimentation app. It is a Vue 3 + Vite SSG site used to demonstrate the dock in multiple visual styles and to expose live configuration controls.

3. `examples/*`
   Minimal integration samples for plain HTML, Vite + Vue, Vite + React, and Nuxt 4. These examples demonstrate how the custom elements are consumed from different runtimes.

At the root level, the workspace also contains:

- `package.json`: workspace scripts and the package metadata that is copied into the final distributable.
- `.build.mjs`: the release-oriented build script that prepares the root `dist/` directory for publishing.
- `dist/`: the generated package output consumed by the examples/playground and intended for npm publication.
- `README.md`: the public-facing install and API guide.

## High-Level Architecture

The project is split into a small runtime library and a larger demo surface:

- The library is intentionally thin.
  It only knows how to register custom elements, accept configuration via element attributes/properties, calculate per-item scale from pointer proximity, and animate each item to its new size.

- The playground owns presentation.
  It does not change the library internals. Instead, it composes `dock-wrapper` and `dock-item` with different slot contents, container shells, and route-driven state to produce different dock styles.

- Examples validate framework interoperability.
  Because the runtime is built on Web Components, the examples mostly focus on import timing and SSR/client-only behavior rather than framework-specific wrappers.

This means the repository follows a "headless-ish interaction engine + themed composition layer" model:

- `packages/dockbar` provides interaction primitives.
- `packages/playground` provides branded compositions and live controls.
- `examples/*` provide integration references.

## Workspace and Build Layout

### Root workspace

`pnpm-workspace.yaml` includes:

- `packages/*`
- `examples/*`

The root `package.json` is both the workspace control point and the source of truth for the published package metadata:

- `exports` maps the package root to `./dockbar.js` and types, and also exposes `./dist`.
- `packageManager` pins pnpm 11.17. Use Node 24 for repository tooling and deployments; the verification matrix also runs on Node 26.
- `scripts.dev` runs the library package in Vite dev mode.
- `scripts.dev:playground` runs the Vue playground.
- `scripts.build` executes `.build.mjs`.
- `scripts.publish` executes `.build.mjs --publish`.

### Release flow

The release process is two-stage:

1. `packages/dockbar` builds the runtime bundle and type declarations into the root `dist/` directory.
2. `.build.mjs` rewrites `dist/package.json`, copies `README.md` and `LICENSE`, reports Brotli size, and optionally publishes `dist/` to npm.

The library package itself is private. Publication happens from the root package metadata after the build output has been normalized.

## Library Package: `packages/dockbar`

### Entry points

The public entry is `packages/dockbar/src/index.ts`, which re-exports:

- `./components/dock-wrapper`
- `./components/dock-item`
- `./components/dock-separator`

Each component file uses `@customElement(...)`, so importing the package is enough to register the custom elements globally.

### Technology choices

- Lit is used for Web Component authoring.
- Anime.js is used for size/scale animation.
- Vite builds the library in `es`, `iife`, and `umd` formats.
- TypeScript emits declaration files into `dist/types`.

### `dock-wrapper`: orchestration and pointer-driven scaling

`dock-wrapper` is the interaction controller.

Its responsibilities are:

1. Track child `dock-item` and `dock-separator` elements.
   On `<slot>` changes, it inspects assigned nodes, keeps `DOCK-ITEM` children for scaling/sorting, and keeps separators as block boundaries.

2. Distribute shared configuration to children.
   It pushes `size`, `easing`, `gap`, and `direction` down to each `dock-item`, and pushes `size` and `direction` down to each `dock-separator`. Item-specific dimensions such as `width` remain owned by each `dock-item`.

3. Listen for interaction events.
   It attaches hover and sortable-pointer listeners once the component becomes ready on the client. High-frequency `mousemove` and drag `pointermove` events are coalesced to one update per animation frame, with the latest pointer position winning.

4. Compute scale from pointer distance.
   In the scheduled frame, it measures all visible item bounding boxes before writing any new scales. It then finds each center along the active axis and evaluates the average slope of a sine curve across the item's unscaled bounds, producing a cosine-shaped magnification wave between `1` and `maxScale` inside `maxRange`. Using both item edges instead of only the center keeps the response consistent for custom-width items.

5. Reset the dock when the pointer leaves.
   On `mouseleave`, it sets every child `scale` back to `1`.

6. Constrain sortable drag blocks.
   When `sortable` is enabled, `dock-separator` elements split the item list into blocks. A dragged item can only be reordered inside its original block; moving past a separator is treated as an invalid drop and snaps back. Item providers may also opt into an isolated sort container with fixed bounds. Measurements are shared between insertion, hover, and FLIP calculations where possible, and the placeholder is only moved when the insertion index changes.

7. Render layout-level styles.
   It applies CSS variables and inline styles for size, gap, padding, orientation, and overall wrapper thickness.

Important implementation details:

- Orientation is axis-aware.
  `direction` decides whether distance is measured with `clientX` or `clientY`.

- Position affects layout alignment.
  `position` is used by CSS to choose whether items align toward the top, bottom, left, or right edge of the wrapper.

- Reads precede writes in continuous interaction paths.
  Hover and drag frames batch geometry reads before scale, placeholder, preview, or animation writes. Pending frames are canceled on leave, disconnect, direction changes, pointer cancellation, or when the component becomes disabled.

- Drag previews use compositor-friendly movement.
  The fixed preview is positioned with `translateX` / `translateY` instead of continuously changing `left` / `top`. Reorder FLIP measurements are also split into read and write phases.

- Server-side execution is partially guarded.
  The component detects a server environment and skips observer/event setup there, but the library is still not treated as fully SSR-safe.

- Overflow support is unfinished.
  The CSS contains overflow states, but runtime overflow detection is not implemented.

### `dock-item`: animated visual container

`dock-item` is the animated cell that hosts arbitrary slotted content.

Its responsibilities are:

1. Render the item shell.
   The internal DOM is a `<li>` with nested positioning and scaling wrappers around the default `<slot>`, plus a named `indicator` slot in a separate non-scaling overlay layer.

2. Accept layout and animation inputs.
   It exposes `size`, optional per-item `width` and `height`, `resize-duration`, `resize-exit-duration`, `resize-ease`, `gap`, `direction`, `easing`, and `scale` as Lit-backed attributes/properties. `scale` uses a custom non-rendering accessor because the shadow DOM structure does not need to be re-rendered for every pointer frame.

3. Animate geometry changes.
   The scale accessor calls `onScaleChanged()` directly after the first render. Each item keeps one reusable Anime.js geometry channel instead of constructing new animations for every pointer or base-size update. Width, height, and scale share the same geometry state so changing an item's base dimensions preserves its current Dock magnification instead of briefly rendering at scale `1`. Pointer-driven scale remains a fast 100ms response. Base-size expansion and contraction default to crisp 200ms and 160ms transitions with a dedicated smooth-out curve; all three resize parameters are configurable per item. Its render callback applies:
   - scaled width and height on the outer `.dock-item` element
   - animated base width, base height, and transform scale on the inner `.dock-item__scale` element

4. Preserve hover continuity between items.
   `::before` and `::after` pseudo-elements extend the effective interaction area across the configured gap, reducing the chance that the hover effect breaks when the pointer moves between neighboring items.

The result is a two-layer animation model:

- outer element changes the occupied layout size
- inner element scales the slotted visual content

The named `indicator` slot follows the outer element's footprint but stays outside the inner scale transform. That separation allows the dock to "inflate" while keeping both content centered and indicators at a fixed visual size.

### `dock-separator`: block boundary

`dock-separator` is a non-scaling layout element. It renders a small separator line, receives `size` and `direction` from `dock-wrapper`, and exposes a local `thickness` property for its occupied width or height.

Separators are not included in hover scale calculations or `on-sort` indexes. Their main runtime role is to split sortable docks into independent drag blocks.

### Optional minimized-window add-on

`dockbar/minimize` is a separate browser-only capability bundle. Importing it registers `dock-minimize-area` without adding the DOM snapshot dependency to the base Dock bundle.

The add-on is split into three responsibilities:

1. Snapshot capture clones a mounted source element with `modern-screenshot`, caches compatible pre-captures, and owns the canvas/blob URL until the window is restored or disposed.
2. A document-level coordinator renders one fixed overlay canvas at a time and applies the Genie deformation for top, right, bottom, and left Dock positions.
3. `dock-minimize-area` owns registered window handles and their generated thumbnail items. The source window remains application-owned and mounted; a default visibility adapter or a consumer-provided async adapter performs the canvas/DOM handoff.

The area is a direct child of `dock-wrapper`, but its thumbnail `dock-item` elements live in the area's shadow root. A small item-provider protocol lets the wrapper include those items in hover magnification and shared configuration. When the wrapper is sortable, the area opts its thumbnails into an isolated shadow-root sort container. Provider reorders cannot cross the area boundary and remain excluded from the wrapper's `on-sort` and `on-delete` indexes and events.

Minimized slots are initially added in minimize order, can then be reordered inside the area, and are removed after restore. The separator remains an explicit sibling chosen by the consumer rather than an implicit part of the area.

### Configuration model

The public configuration surface is attribute/property driven:

- `size`
- per-item `width`
- `padding`
- `gap`
- `max-scale`
- `max-range`
- `disabled`
- `direction`
- `position`
- `will-change`
- `easing`
- `sortable`
- `allow-drag-delete`
- separator `thickness`

The wrapper owns most config and forwards a subset to items and separators. Consumers usually configure only `dock-wrapper`, provide arbitrary slotted markup inside `dock-item`, and insert `dock-separator` wherever they want a block boundary.

### Styling model

The library keeps styling intentionally light:

- wrapper layout styles live in `DockWrapper.styles`
- item structure styles live in `DockItem.styles`
- actual visual branding is expected to come from slotted content and host-level CSS

This is why the examples and playground can make the same runtime look like different products without changing the library code.

## Runtime Data Flow

The runtime interaction loop is:

1. Consumer imports `dockbar` (or `dockbar/dist`).
2. Browser registers `dock-wrapper`, `dock-item`, and `dock-separator`.
3. Consumer renders `dock-item` children, and optionally `dock-separator` boundaries, inside a `dock-wrapper`.
4. `dock-wrapper` sees the slot change, captures the children, and propagates shared props.
5. Pointer movement queues a single animation-frame update; later events in the same frame replace the pending coordinates.
6. The frame measures visible items, calculates the scale profile, and assigns only changed `scale` properties. Attribute parsing is bypassed for this internal wrapper-to-item update.
7. Each changed `dock-item` retargets its reusable Anime.js geometry channel without requesting a Lit render. Reactive base-size changes use that same channel, keeping width, height, and magnification synchronized.

The slot content itself is never interpreted by the library. The library only scales the container and lets the slotted child fill the item box via `::slotted(*) { width: 100%; height: 100%; }`.

## Playground Package: `packages/playground`

### Role in the repository

The playground is the internal demo site and the closest thing this repository has to an implementation showcase. It is not required for the library to function, but it is where most repo-specific UI code lives.

### Stack

- Vue 3
- Vite
- `vite-ssg`
- `vite-plugin-pages`
- UnoCSS
- VueUse
- Tweakpane
- Highlight.js
- PWA support via `vite-plugin-pwa`

The app is clearly derived from the Vitesse starter template, and some template leftovers still exist.

The playground Dockerfile installs from the canonical workspace lockfile. Build it from the repository root with `docker buildx build -f packages/playground/Dockerfile .`.

### Boot sequence

`src/main.ts` uses `ViteSSG()` to create the app:

- routes come from `vite-plugin-pages`
- every file under `src/modules/*.ts` is eagerly imported and its `install()` function is executed

This gives the playground a modular startup model.

### Application shell

`src/App.vue` owns the full-screen background and parallax effect:

- it uses `useMouse()` to track pointer position
- it computes a small background offset relative to screen center
- it swaps background images based on dark mode
- it renders the router view above the animated background

### Route structure

The route surface is small:

- `src/pages/index.vue`: the main demo page
- `src/pages/[...all].vue`: the fallback "not found" page

Generated routes render directly; the unused starter-template layout layer has been removed.

### Main page composition

`src/pages/index.vue` assembles the showcase:

- a floating style switcher (`StyleTab`)
- a glassmorphism-like window shell (`VisionosWindow`)
- the `Home` view inside that window
- a client-only dock mounted outside the window and positioned relative to the window bounds

The page measures the floating window with `useElementBounding()` and derives dock offsets from the selected dock position. That keeps the dock visually attached to the demo window rather than the raw viewport.

### State model

The playground uses simple module-level reactive singletons.

#### `src/composables/config.ts`

Defines the live dock config:

- `size`
- `padding`
- `gap`
- `maxScale`
- `maxRange`
- `disabled`
- `direction`
- `position`

Every dock style reads from this same shared object.

#### `src/composables/style.ts`

Defines the active visual theme:

- available styles: `default`, `macos`, `rauno`
- route query `?style=...` is treated as the source of truth
- invalid values are normalized back to `default`

This means dock theme selection is URL-addressable.

#### `src/composables/code.ts`

Builds the code sample shown in the UI by converting the live config object into an HTML example snippet. The code block is not hard-coded text; it is generated from the same config used by the live dock.

#### `src/composables/dark.ts`

Wraps VueUse dark-mode helpers:

- `isDark`
- `toggleDark`
- `preferredDark`

### Dock style switching

`src/components/Dock/index.vue` resolves the current dock implementation component dynamically from `activeStyle`:

- `CatsJuiceDock.vue`
- `MacosDock.vue`
- `RaunoDock.vue`

All three styles reuse the same `dock-wrapper` / `dock-item` / `dock-separator` runtime and differ only in slot content and surrounding CSS.

### Dock variants

#### `CatsJuiceDock.vue`

Creates a glassy social/action dock with icon buttons and a separator. It imports `dockbar/dist`, binds the shared `config`, and uses slotted icon buttons as the item content.

#### `MacosDock.vue`

Creates a more literal macOS-like icon dock using image assets from `public/macos-icons`. It also adds a custom `LofiIcon` item and a dark-mode toggle item.

#### `RaunoDock.vue`

Loads raw SVG assets with Vite's current `import.meta.glob(..., { query: '?raw', import: 'default' })` form and recreates the cleaner pill-shaped dock inspired by Rauno's site.

### Supporting components

Important reusable playground components include:

- `Home.vue`
  The main content view. It shows the project intro, install snippets, configuration controls, and a generated code sample.

- `ConfigPanel.vue`
  Builds a Tweakpane control surface around the shared `config` object. Position changes also force `direction` to switch between horizontal and vertical.

- `StyleTab.vue`
  The visual style selector. It maps route changes to a moving indicator.

- `CodeBox.vue`
  Syntax-highlighted code viewer with copy-to-clipboard support.

- `LightBorderFrame.vue`
  SVG-based gradient border shell reused by several glassmorphism components.

- `VisionosWindow.vue`
  A window-like wrapper built on top of `LightBorderFrame`.

- `MusicAnim.vue`, `LofiIcon.vue`, and `anims/swing-up.ts`
  Small decorative interaction effects used by the macOS-style dock.

### Playground modules

The files in `src/modules` are startup plugins:

- `highlightjs.ts`: registers syntax highlighting
- `i18n.ts`: lazy-loads locale files and sets English as the initial locale
- `nprogress.ts`: starts/stops route progress bars
- `pwa.ts`: registers the service worker on the client

This module pattern keeps app boot concerns out of `main.ts`.

## Examples

The `examples` directory is the interoperability layer.

### `examples/esm` and `examples/iife`

These show plain HTML consumption from CDN bundles:

- ESM example loads `dockbar.js`
- IIFE example loads `dockbar.iife.js`

The ESM example also demonstrates the `:defined` visibility workaround to avoid the flash that can happen before custom element styles are ready.

### `examples/vite-vue`

Shows direct use from a Vue app by importing `dockbar` and rendering native custom elements in a template.

### `examples/vite-react`

Shows the same idea in React JSX. There is no React wrapper component; React renders the custom elements directly.

### `examples/nuxt3` (Nuxt 4; historical directory name)

Demonstrates the current SSR limitation. The page wraps the dock in `<ClientOnly>`, which matches the limitation already called out in the public README.

## Testing and Quality Status

The repository combines unit scaffolding with browser-level behavior and performance coverage.

Current coverage:

- `packages/playground/test/basic.test.ts` is only a placeholder sanity test.
- `packages/playground/test/component.test.ts` mounts a real playground component and verifies its rendered slot and normalized CSS size props.
- `packages/playground/cypress/e2e/basic.spec.ts` smoke-tests the built UI and verifies that the Tweakpane size control updates dock items.
- `tests/playwright/playground.spec.ts` exercises hover scaling, Tweakpane configuration, custom widths, sorting, drag previews, separator boundaries, and queued-hover cancellation against the built playground.
- `scripts/benchmark-pointer.mjs` runs repeatable baseline/candidate hover and drag workloads in Chromium. It reports DOM operation counts, CDP layout/style/script timings, frame cadence, long tasks, long animation frames, and scale-profile correctness. Run it through `pnpm benchmark:pointer` with absolute `DOCKBAR_BASELINE_BUNDLE` and `DOCKBAR_CANDIDATE_BUNDLE` paths.

Practical conclusion:

- Core pointer behavior and the migrated playground configuration control have browser regression coverage.
- Performance changes should be checked with the benchmark runner and browser tests, not inferred from source changes alone.

## Known Constraints and Implementation Gaps

The codebase itself documents or implies several constraints:

1. SSR is not fully supported.
   The library can be imported in client-only contexts, but frameworks such as Nuxt currently need client-only rendering strategies.

2. Initial style loading can flash.
   The public README already recommends hiding the custom element until `:defined`.

3. Overflow handling is incomplete.
   Overflow CSS states exist, but there is no runtime overflow detector to activate them.

4. Playground docs contain template leftovers.
   `packages/playground/README.md` and `README.zh-CN.md` are mostly inherited Vitesse template docs and should not be treated as authoritative architecture documentation for this repository.

5. Framework integration coverage is still incomplete.
   Core interactions have Playwright coverage, but the example applications and SSR integrations still rely mostly on build checks and manual validation.

## Where To Read Next

For different kinds of context, use these files in this order:

1. `ARCHITECTURE.md`
   Repo structure, runtime design, implementation notes, and known gaps.

2. `README.md`
   Public install instructions, public API/configuration table, and end-user usage notes.

3. `packages/dockbar/src/components/dock-wrapper.ts`
   Core scaling algorithm and shared-prop propagation.

4. `packages/dockbar/src/components/dock-item.ts`
   Per-item animation and sizing behavior.

5. `packages/dockbar/src/components/dock-separator.ts`
   Separator layout, orientation, and block-boundary behavior.

6. `packages/playground/src/**/*`
   Demo composition, state flow, and styling examples built on top of the library.
