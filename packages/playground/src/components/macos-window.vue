<script setup lang="ts">
interface Props {
  title: string
  width?: number
  height?: number
  zIndex?: number
  initialOffsetX?: number
  initialOffsetY?: number
}

interface WindowGeometry {
  x: number
  y: number
  width: number
  height: number
}

const props = withDefaults(defineProps<Props>(), {
  width: 720,
  height: 470,
  zIndex: 100,
  initialOffsetX: 0,
  initialOffsetY: 0,
})

const emit = defineEmits<{
  activate: []
  close: []
  minimize: []
  prepare: []
  cancelPrepare: []
}>()

const frame = ref<HTMLElement | null>(null)
const maximized = ref(false)
const geometry = reactive<WindowGeometry>({
  x: 0,
  y: 0,
  width: props.width,
  height: props.height,
})

let previousGeometry: WindowGeometry | undefined
let dragPointerId: number | undefined
let dragOrigin = { pointerX: 0, pointerY: 0, windowX: 0, windowY: 0 }

const frameStyle = computed(() => ({
  left: `${geometry.x}px`,
  top: `${geometry.y}px`,
  width: `${geometry.width}px`,
  height: `${geometry.height}px`,
  zIndex: props.zIndex,
}))

function viewportSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

function fitSize(width: number, height: number) {
  const viewport = viewportSize()
  return {
    width: Math.min(width, Math.max(280, viewport.width - 24)),
    height: Math.min(height, Math.max(240, viewport.height - 24)),
  }
}

function clampPosition(x: number, y: number, width = geometry.width, height = geometry.height) {
  const viewport = viewportSize()
  const titlebarVisibleWidth = Math.min(180, width)

  return {
    x: Math.min(
      Math.max(x, 18 - width + titlebarVisibleWidth),
      viewport.width - titlebarVisibleWidth - 18,
    ),
    y: Math.min(Math.max(y, 12), Math.max(12, viewport.height - Math.min(52, height))),
  }
}

function resetGeometry() {
  const viewport = viewportSize()
  const fitted = fitSize(props.width, props.height)
  const position = clampPosition(
    (viewport.width - fitted.width) / 2 + props.initialOffsetX,
    (viewport.height - fitted.height) / 2 + props.initialOffsetY,
    fitted.width,
    fitted.height,
  )

  Object.assign(geometry, fitted, position)
}

function onResize() {
  const viewport = viewportSize()

  if (maximized.value) {
    Object.assign(geometry, {
      x: 10,
      y: 10,
      width: Math.max(280, viewport.width - 20),
      height: Math.max(240, viewport.height - 20),
    })
    return
  }

  const fitted = fitSize(geometry.width, geometry.height)
  const position = clampPosition(geometry.x, geometry.y, fitted.width, fitted.height)
  Object.assign(geometry, fitted, position)
}

function onDragStart(event: PointerEvent) {
  if (maximized.value || event.button !== 0)
    return

  const target = event.target as HTMLElement
  if (target.closest('[data-window-control]'))
    return

  emit('activate')
  dragPointerId = event.pointerId
  dragOrigin = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    windowX: geometry.x,
    windowY: geometry.y,
  }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  event.preventDefault()
}

function onDragMove(event: PointerEvent) {
  if (dragPointerId !== event.pointerId)
    return

  const position = clampPosition(
    dragOrigin.windowX + event.clientX - dragOrigin.pointerX,
    dragOrigin.windowY + event.clientY - dragOrigin.pointerY,
  )
  Object.assign(geometry, position)
}

function onDragEnd(event: PointerEvent) {
  if (dragPointerId !== event.pointerId)
    return

  const target = event.currentTarget as HTMLElement
  if (target.hasPointerCapture(event.pointerId))
    target.releasePointerCapture(event.pointerId)
  dragPointerId = undefined
}

function activate() {
  emit('activate')
}

function onTitlebarDoubleClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('[data-window-control]'))
    toggleMaximized()
}

function toggleMaximized() {
  emit('activate')
  const viewport = viewportSize()

  if (!maximized.value) {
    previousGeometry = { ...geometry }
    Object.assign(geometry, {
      x: 10,
      y: 10,
      width: Math.max(280, viewport.width - 20),
      height: Math.max(240, viewport.height - 20),
    })
    maximized.value = true
    return
  }

  if (previousGeometry) {
    const fitted = fitSize(previousGeometry.width, previousGeometry.height)
    const position = clampPosition(previousGeometry.x, previousGeometry.y, fitted.width, fitted.height)
    Object.assign(geometry, fitted, position)
  }
  else {
    resetGeometry()
  }
  maximized.value = false
}

onMounted(() => {
  resetGeometry()
  window.addEventListener('resize', onResize, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})

defineExpose({
  element: frame,
  activate,
  maximized,
})
</script>

<template>
  <section
    ref="frame"
    class="macos-window"
    :class="{ 'is-maximized': maximized }"
    :style="frameStyle"
    role="dialog"
    :aria-label="title"
    @pointerdown="activate"
  >
    <header
      class="titlebar"
      data-dock-drag-handle
      @dblclick="onTitlebarDoubleClick"
      @pointerdown="onDragStart"
      @pointermove="onDragMove"
      @pointerup="onDragEnd"
      @pointercancel="onDragEnd"
    >
      <div class="traffic-lights">
        <button
          class="traffic-light close"
          data-window-control
          data-window-action="close"
          type="button"
          aria-label="Close window"
          @pointerdown.stop
          @click.stop="emit('close')"
        >
          <svg
            class="traffic-light-symbol"
            viewBox="0 0 8 8"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M1.88 1.88 6.12 6.12 M6.12 1.88 1.88 6.12" />
          </svg>
        </button>
        <button
          class="traffic-light minimize"
          data-window-control
          data-window-action="minimize"
          type="button"
          aria-label="Minimize window"
          @pointerdown.stop
          @pointerenter="emit('prepare')"
          @pointerleave="emit('cancelPrepare')"
          @click.stop="emit('minimize')"
        >
          <svg
            class="traffic-light-symbol"
            viewBox="0 0 8 8"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M1 4H7" />
          </svg>
        </button>
        <button
          class="traffic-light zoom"
          data-window-control
          data-window-action="zoom"
          type="button"
          :aria-label="maximized ? 'Restore window size' : 'Maximize window'"
          @pointerdown.stop
          @click.stop="toggleMaximized"
        >
          <svg
            class="traffic-light-symbol"
            viewBox="0 0 8 8"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M1 4H7 M4 1V7" />
          </svg>
        </button>
      </div>
      <span class="window-title">{{ title }}</span>
      <div class="titlebar-spacer" />
    </header>

    <main class="window-content">
      <slot />
    </main>
  </section>
</template>

<style scoped>
.macos-window {
  --window-border: rgba(27, 31, 40, 0.2);
  --titlebar-background: rgba(246, 246, 246, 0.92);
  --window-background: #f5f5f7;
  position: fixed;
  display: flex;
  flex-direction: column;
  min-width: 280px;
  min-height: 240px;
  overflow: hidden;
  color: #22242a;
  background: var(--window-background);
  border: 1px solid var(--window-border);
  border-radius: 13px;
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.3),
    0 7px 24px rgba(0, 0, 0, 0.18),
    inset 0 1px rgba(255, 255, 255, 0.75);
  contain: layout;
}

.macos-window.is-maximized {
  border-radius: 10px;
}

.titlebar {
  position: relative;
  z-index: 3;
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) 92px;
  align-items: center;
  flex: 0 0 45px;
  padding: 0 14px;
  background: var(--titlebar-background);
  border-bottom: 1px solid rgba(0, 0, 0, 0.09);
  backdrop-filter: blur(24px) saturate(160%);
  cursor: default;
  touch-action: none;
  user-select: none;
}

.window-title {
  overflow: hidden;
  color: rgba(25, 27, 32, 0.82);
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.traffic-lights {
  display: flex;
  align-items: center;
  gap: 8px;
  width: max-content;
}

.traffic-light {
  position: relative;
  width: 12px;
  height: 12px;
  padding: 0;
  appearance: none;
  border: 0.5px solid rgba(0, 0, 0, 0.16);
  border-radius: 50%;
  cursor: default;
}

/* Keep every glyph on one paint layer so intersections do not double their opacity. */
.traffic-light-symbol {
  position: absolute;
  inset: 0;
  width: 8px;
  height: 8px;
  margin: auto;
  overflow: visible;
  pointer-events: none;
  fill: none;
  opacity: 0;
  stroke: rgb(35, 27, 23);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.25px;
}

.traffic-light-symbol path {
  vector-effect: non-scaling-stroke;
}

.traffic-lights:hover .traffic-light-symbol,
.traffic-light:focus-visible .traffic-light-symbol {
  opacity: 0.72;
}

.traffic-light.close {
  background: #ff5f57;
}

.traffic-light.minimize {
  background: #febc2e;
}

.traffic-light.zoom {
  background: #28c840;
}

.traffic-light:focus-visible {
  outline: 2px solid rgba(0, 112, 255, 0.65);
  outline-offset: 2px;
}

.window-content {
  min-width: 0;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

:global(.dark) .macos-window {
  --window-border: rgba(255, 255, 255, 0.13);
  --titlebar-background: rgba(39, 39, 41, 0.94);
  --window-background: #242426;
  color: #f4f4f6;
  box-shadow:
    0 24px 75px rgba(0, 0, 0, 0.55),
    0 7px 28px rgba(0, 0, 0, 0.38),
    inset 0 1px rgba(255, 255, 255, 0.08);
}

:global(.dark) .titlebar {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

:global(.dark) .window-title {
  color: rgba(255, 255, 255, 0.82);
}

@media (max-width: 520px) {
  .titlebar {
    grid-template-columns: 82px minmax(0, 1fr) 82px;
    padding-inline: 10px;
  }
}
</style>
