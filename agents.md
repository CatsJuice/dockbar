# Project Documentation Map

Use the following files as the primary documentation entry points for this repository:

- `ARCHITECTURE.md`
  The main architecture and implementation document. Read this first for workspace layout, library internals, playground structure, build/release flow, and known gaps.

- `README.md`
  The public technical guide for installation, usage, configuration, and current runtime caveats.

- `examples/`
  Framework and runtime integration references for plain HTML, Vue, React, and Nuxt 3.

- `packages/dockbar/src/`
  The canonical implementation of the published library.

- `packages/playground/src/`
  The canonical implementation of the demo/showcase application.

Notes for future agents:

- Prefer `ARCHITECTURE.md` and the root `README.md` over `packages/playground/README.md` or `packages/playground/README.zh-CN.md`.
- The playground README files are inherited template docs and are not authoritative project documentation for Dockbar itself.
- If you change any public API surface of the package, including parameters, attributes, events, or usage behavior that users need to know, update the root `README.md` in the same change.
