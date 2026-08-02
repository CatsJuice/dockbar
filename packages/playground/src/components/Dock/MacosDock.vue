<script lang="ts" setup>
import 'dockbar'
import 'dockbar/minimize'
import type {
  DockMinimizeArea,
  DockWindowHandle,
  DockWindowState,
  DockWindowStateChangeDetail,
} from 'dockbar/minimize'
import type { ComponentPublicInstance } from 'vue'
import MacosMockApp from '../macos-mock-app.vue'
import MacosWindow from '../macos-window.vue'

type AppId
  = | 'files'
    | 'app-store'
    | 'freeform'
    | 'keynote'
    | 'mail'
    | 'messages'
    | 'mindfulness'
    | 'music'
    | 'tv'
    | 'lofi'
    | 'appearance'

interface AppDefinition {
  id: AppId
  name: string
  icon?: string
  width: number
  height: number
  offsetX: number
  offsetY: number
}

interface MacosWindowInstance extends ComponentPublicInstance {
  element: HTMLElement | null
  activate: () => void
}

const apps: readonly AppDefinition[] = [
  {
    id: 'files',
    icon: 'Files.jpg',
    name: 'Files',
    width: 690,
    height: 455,
    offsetX: -76,
    offsetY: -38,
  },
  {
    id: 'app-store',
    icon: 'App Store.jpg',
    name: 'App Store',
    width: 760,
    height: 500,
    offsetX: -42,
    offsetY: -24,
  },
  {
    id: 'freeform',
    icon: 'Freeform.jpg',
    name: 'Freeform',
    width: 720,
    height: 475,
    offsetX: -15,
    offsetY: -12,
  },
  {
    id: 'keynote',
    icon: 'Keynote.jpg',
    name: 'Keynote',
    width: 840,
    height: 520,
    offsetX: 12,
    offsetY: -30,
  },
  {
    id: 'mail',
    icon: 'Mail.jpg',
    name: 'Mail',
    width: 870,
    height: 510,
    offsetX: 36,
    offsetY: -17,
  },
  {
    id: 'messages',
    icon: 'Messages.jpg',
    name: 'Messages',
    width: 680,
    height: 475,
    offsetX: 62,
    offsetY: -5,
  },
  {
    id: 'mindfulness',
    icon: 'Mindfulness.jpg',
    name: 'Mindfulness',
    width: 760,
    height: 505,
    offsetX: -55,
    offsetY: 20,
  },
  {
    id: 'music',
    icon: 'Music.jpg',
    name: 'Music',
    width: 760,
    height: 510,
    offsetX: -20,
    offsetY: 25,
  },
  {
    id: 'tv',
    icon: 'TV.jpg',
    name: 'TV',
    width: 790,
    height: 500,
    offsetX: 18,
    offsetY: 22,
  },
  {
    id: 'lofi',
    name: 'Lofi',
    width: 790,
    height: 495,
    offsetX: 48,
    offsetY: 24,
  },
  {
    id: 'appearance',
    icon: 'Settings.jpg',
    name: 'Appearance',
    width: 740,
    height: 500,
    offsetX: 72,
    offsetY: 16,
  },
]

const minimizeArea = ref<DockMinimizeArea | null>(null)
const openWindows = reactive<Record<AppId, boolean>>(createAppRecord(false))
const windowStates = reactive<Record<AppId, DockWindowState>>(createAppRecord('disposed'))
const windowZIndices = reactive<Record<AppId, number>>(createAppRecord(100))
const windowInstances = new Map<AppId, MacosWindowInstance>()
const windowHandles = new Map<AppId, DockWindowHandle>()
const pendingActions = new Map<AppId, Promise<void>>()
const hasMinimizedWindows = computed(() => apps.some((app) => {
  return ['minimizing', 'minimized', 'restoring'].includes(windowStates[app.id])
}))
const musicExpanded = ref(false)
const musicItemWidth = computed(() => config.size * (musicExpanded.value ? 2 : 1))

let topZIndex = 100
let unmounting = false

function createAppRecord<T>(value: T): Record<AppId, T> {
  return Object.fromEntries(apps.map(app => [app.id, value])) as Record<AppId, T>
}

function isAppId(value: string): value is AppId {
  return apps.some(app => app.id === value)
}

function setWindowInstance(id: AppId, instance: Element | ComponentPublicInstance | null) {
  if (instance)
    windowInstances.set(id, instance as MacosWindowInstance)
  else
    windowInstances.delete(id)
}

function getWindowElement(id: AppId) {
  return windowInstances.get(id)?.element ?? null
}

function syncWindowState(id: AppId) {
  const handle = windowHandles.get(id)
  windowStates[id] = handle?.state ?? (openWindows[id] ? 'idle' : 'disposed')
}

function activateWindow(id: AppId) {
  if (!openWindows[id])
    return

  topZIndex += 1
  windowZIndices[id] = topZIndex
}

function registerWindow(app: AppDefinition) {
  const currentHandle = windowHandles.get(app.id)
  if (currentHandle && currentHandle.state !== 'disposed')
    return currentHandle

  const area = minimizeArea.value
  const element = getWindowElement(app.id)
  if (!area || !element)
    throw new Error(`Unable to register the ${app.name} mock window`)

  const handle = area.registerWindow({
    id: app.id,
    label: app.name,
    source: () => getWindowElement(app.id),
  })
  windowHandles.set(app.id, handle)
  syncWindowState(app.id)
  return handle
}

function runAppAction(id: AppId, action: () => Promise<void>) {
  const current = pendingActions.get(id)
  if (current)
    return current

  const pending = action()
    .catch((error: unknown) => {
      if (!unmounting)
        console.error(`[dockbar playground] ${id} window action failed`, error)
    })
    .finally(() => {
      if (pendingActions.get(id) === pending)
        pendingActions.delete(id)
      syncWindowState(id)
    })

  pendingActions.set(id, pending)
  return pending
}

function openApp(app: AppDefinition) {
  return runAppAction(app.id, async () => {
    if (openWindows[app.id]) {
      const handle = windowHandles.get(app.id) ?? registerWindow(app)
      if (handle?.state === 'minimized') {
        windowStates[app.id] = 'restoring'
        await handle.restore()
        return
      }
      activateWindow(app.id)
      return
    }

    openWindows[app.id] = true
    windowStates[app.id] = 'idle'
    await nextTick()
    try {
      registerWindow(app)
      activateWindow(app.id)
    }
    catch (error) {
      openWindows[app.id] = false
      windowStates[app.id] = 'disposed'
      throw error
    }
  })
}

function minimizeApp(app: AppDefinition) {
  return runAppAction(app.id, async () => {
    const handle = registerWindow(app)
    if (handle.state !== 'idle')
      return

    windowStates[app.id] = 'minimizing'
    await handle.minimize()
  })
}

function prepareApp(app: AppDefinition) {
  const handle = windowHandles.get(app.id)
  if (!handle || handle.state !== 'idle')
    return

  Promise.resolve(handle.prepare()).catch((error: unknown) => {
    if (!unmounting)
      console.error(`[dockbar playground] ${app.id} snapshot preparation failed`, error)
  })
}

function cancelPrepareApp(app: AppDefinition) {
  const handle = windowHandles.get(app.id)
  if (handle?.state === 'idle')
    handle.cancelPrepare()
}

function closeApp(app: AppDefinition) {
  return runAppAction(app.id, async () => {
    const handle = windowHandles.get(app.id)
    try {
      if (handle)
        await handle.dispose()
    }
    finally {
      windowHandles.delete(app.id)
      openWindows[app.id] = false
      windowStates[app.id] = 'disposed'
    }
  })
}

function setMusicHovered(hovered: boolean) {
  if (hovered && !window.matchMedia('(hover: hover) and (pointer: fine)').matches)
    return

  musicExpanded.value = hovered
}

function onDockItemPointerEnter(app: AppDefinition) {
  if (app.id === 'music')
    setMusicHovered(true)
}

function onDockItemPointerLeave(app: AppDefinition) {
  if (app.id === 'music')
    setMusicHovered(false)
}

function onDockAppFocus(app: AppDefinition) {
  if (app.id !== 'music')
    return

  musicExpanded.value = true
}

function onDockAppBlur(app: AppDefinition) {
  if (app.id !== 'music')
    return

  musicExpanded.value = false
}

function getDockAppStyle(app: AppDefinition) {
  if (app.id !== 'music')
    return undefined

  return {
    '--music-collapsed-width': `${config.size}px`,
    '--music-expanded-width': `${config.size * 2}px`,
    '--music-height': `${config.size}px`,
  }
}

function onWindowStateChange(event: Event) {
  const detail = (event as CustomEvent<DockWindowStateChangeDetail>).detail
  if (!detail || !isAppId(detail.id))
    return

  windowStates[detail.id] = detail.state
  if (detail.state === 'idle' && detail.previousState === 'restoring')
    activateWindow(detail.id)
}

watch(isDark, () => {
  for (const handle of windowHandles.values())
    handle.invalidatePreparedSnapshot()
})

onBeforeUnmount(() => {
  unmounting = true
  for (const handle of windowHandles.values()) {
    Promise.resolve(handle.dispose()).catch(() => {})
  }
  windowHandles.clear()
  windowInstances.clear()
})
</script>

<template>
  <!-- eslint-disable vue/no-deprecated-slot-attribute -->
  <div class="dock macos-dock">
    <LightBorderFrame :border-width="1" radius="16">
      <dock-wrapper
        :allow-drag-delete="config.allowDragDelete"
        :size="config.size"
        :padding="config.padding"
        :gap="config.gap"
        :max-scale="config.maxScale"
        :max-range="config.maxRange"
        :disabled="config.disabled"
        :direction="config.direction"
        :position="config.position"
        :sortable="config.sortable"
      >
        <dock-item
          v-for="app in apps"
          :key="app.id"
          :width="app.id === 'music' ? musicItemWidth : undefined"
          @pointerenter="onDockItemPointerEnter(app)"
          @pointerleave="onDockItemPointerLeave(app)"
        >
          <div
            v-if="app.id === 'music'"
            class="dock-app is-music"
            :class="{
              'is-open': openWindows.music,
              'is-music-expanded': musicExpanded,
            }"
            :style="getDockAppStyle(app)"
            data-app-id="music"
            :data-window-state="windowStates.music"
          >
            <span class="music-player">
              <button
                class="music-player__artwork"
                type="button"
                aria-label="Open Music"
                @click="openApp(app)"
                @focus="onDockAppFocus(app)"
                @blur="onDockAppBlur(app)"
              >
                <img
                  class="music-player__cover"
                  src="/macos-icons/Music.jpg"
                  alt=""
                  draggable="false"
                >
                <img
                  class="music-player__vinyl"
                  src="/lofi/lofi-cd@0.5x.webp"
                  alt=""
                  draggable="false"
                >
              </button>
              <span class="music-player__reveal">
                <span class="music-player__content">
                  <span class="music-player__copy">
                    <strong>Dreams</strong>
                    <small>Fleetwood Mac</small>
                  </span>
                  <span class="music-player__progress"><i /></span>
                  <span class="music-player__controls" aria-hidden="true">
                    <span>
                      <svg viewBox="0 0 12 12">
                        <path d="M2.25 2.4v7.2M9.75 2.5 4.2 6l5.55 3.5z" />
                      </svg>
                    </span>
                    <span class="music-player__play">
                      <svg viewBox="0 0 12 12">
                        <path d="m3.8 2.25 5.5 3.75-5.5 3.75z" />
                      </svg>
                    </span>
                    <span>
                      <svg viewBox="0 0 12 12">
                        <path d="M9.75 2.4v7.2M2.25 2.5 7.8 6 2.25 9.5z" />
                      </svg>
                    </span>
                  </span>
                </span>
              </span>
            </span>
          </div>
          <button
            v-else
            class="dock-app"
            :class="{ 'is-open': openWindows[app.id] }"
            type="button"
            :aria-label="app.name"
            :title="app.name"
            :data-app-id="app.id"
            :data-window-state="windowStates[app.id]"
            @click="openApp(app)"
          >
            <img
              v-if="app.icon"
              :src="`/macos-icons/${app.icon}`"
              :alt="`${app.name} icon`"
              draggable="false"
            >
            <LofiIcon v-else class="lofi-icon" />
          </button>
          <!-- Custom-element named slots use the native slot attribute. -->
          <span
            v-if="openWindows[app.id]"
            slot="indicator"
            class="running-indicator"
            :data-running-indicator="app.id"
            aria-hidden="true"
          />
        </dock-item>

        <dock-separator
          v-if="hasMinimizedWindows"
          data-testid="macos-window-separator"
        />

        <dock-minimize-area
          ref="minimizeArea"
          aria-label="Minimized windows"
          data-testid="dock-minimize-area"
          @on-window-state-change="onWindowStateChange"
        />
      </dock-wrapper>
    </LightBorderFrame>

    <Teleport to="body">
      <template v-for="app in apps" :key="app.id">
        <MacosWindow
          v-if="openWindows[app.id]"
          :ref="instance => setWindowInstance(app.id, instance)"
          :title="app.name"
          :width="app.width"
          :height="app.height"
          :z-index="windowZIndices[app.id]"
          :initial-offset-x="app.offsetX"
          :initial-offset-y="app.offsetY"
          :data-window-id="app.id"
          :data-testid="`mock-window-${app.id}`"
          @activate="activateWindow(app.id)"
          @close="closeApp(app)"
          @minimize="minimizeApp(app)"
          @prepare="prepareApp(app)"
          @cancel-prepare="cancelPrepareApp(app)"
        >
          <MacosMockApp :app="app.id" />
        </MacosWindow>
      </template>
    </Teleport>
  </div>
</template>

<style scoped>
.macos-dock {
  z-index: 2000;
}

.macos-dock::after {
  position: absolute;
  z-index: -1;
  content: "";
  inset: 0;
  background: rgba(255, 255, 255, 0.13);
  border-radius: 16px;
  backdrop-filter: blur(18px) saturate(180%);
}

.dock-app {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  padding: 0;
  place-items: center;
  overflow: visible;
  background: transparent;
  border: 0;
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  appearance: none;
  -webkit-tap-highlight-color: transparent;
}

.dock-app > img,
.lofi-icon {
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
  object-fit: cover;
  user-select: none;
}

.dock-app.is-music {
  --music-morph-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --music-morph-duration: 160ms;
  --music-content-width: 36px;
  --music-inset: 0px;

  isolation: isolate;
  width: var(--music-collapsed-width);
  height: var(--music-height);
  overflow: visible;
  background: transparent;
  border-radius: 10px;
  box-shadow: none;
  cursor: default;
  transition: width var(--music-morph-duration) var(--music-morph-ease);
  will-change: width;
}

.dock-app.is-music-expanded {
  --music-morph-duration: 200ms;
  --music-inset: 4px;

  width: var(--music-expanded-width);
}

.music-player {
  position: absolute;
  z-index: 1;
  inset: 0;
  display: flex;
  align-items: stretch;
  gap: var(--music-inset);
  padding: var(--music-inset);
  overflow: visible;
  color: #211b20;
  text-align: left;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(235, 231, 236, 0.96));
  border-radius: inherit;
  box-shadow:
    0 3px 8px rgba(38, 30, 36, 0.2),
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.84);
  box-sizing: border-box;
  transition:
    gap var(--music-morph-duration) var(--music-morph-ease),
    padding var(--music-morph-duration) var(--music-morph-ease);
  will-change: gap, padding;
}

.music-player__artwork {
  display: grid;
  flex: 0 0 auto;
  width: auto;
  height: auto;
  aspect-ratio: 1;
  min-width: 0;
  padding: 0;
  overflow: visible;
  background: transparent;
  border: 0;
  border-radius: calc(10px - var(--music-inset));
  box-shadow: 0 1px 3px rgba(47, 28, 40, 0.28);
  cursor: pointer;
  appearance: none;
  -webkit-tap-highlight-color: transparent;
  transition: border-radius var(--music-morph-duration) var(--music-morph-ease);
}

.music-player__artwork img {
  grid-area: 1 / 1;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
  transition:
    opacity var(--music-morph-duration) ease-in-out,
    filter var(--music-morph-duration) ease-in-out;
  will-change: opacity, filter;
}

.is-music-expanded .music-player__artwork img {
  transition-duration: 300ms;
}

.music-player__cover {
  opacity: 1;
  filter: blur(0);
}

.music-player__vinyl {
  opacity: 0;
  filter: blur(2px);
  animation: music-vinyl-spin 20s linear infinite;
  animation-play-state: paused;
}

.is-music-expanded .music-player__artwork {
  box-shadow: none;
}

.is-music-expanded .music-player__cover {
  opacity: 0;
  filter: blur(2px);
}

.is-music-expanded .music-player__vinyl {
  opacity: 1;
  filter: blur(0);
  animation-play-state: running;
}

@keyframes music-vinyl-spin {
  to {
    transform: rotate(1turn);
  }
}

.music-player__reveal {
  display: block;
  flex: 1 1 0;
  width: 0;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.music-player__content {
  display: grid;
  width: var(--music-content-width);
  height: 100%;
  padding: 1px 1px 0 0;
  align-content: center;
  opacity: 0;
  filter: blur(2px);
  transition:
    opacity 160ms ease-in-out,
    filter 160ms ease-in-out;
  will-change: opacity, filter;
}

.is-music-expanded .music-player__content {
  opacity: 1;
  filter: blur(0);
  transition-delay: 20ms;
}

.music-player__copy {
  display: grid;
  min-width: 0;
  line-height: 1.05;
}

.music-player__copy strong,
.music-player__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-player__copy strong {
  font-size: 5.5px;
  font-weight: 680;
  letter-spacing: -0.08px;
}

.music-player__copy small {
  margin-top: 1px;
  color: rgba(55, 45, 52, 0.62);
  font-size: 4px;
  font-weight: 500;
}

.music-player__progress {
  position: relative;
  display: block;
  height: 1.5px;
  margin-top: 3px;
  overflow: hidden;
  background: rgba(59, 48, 56, 0.15);
  border-radius: 999px;
}

.music-player__progress i {
  position: absolute;
  inset: 0 auto 0 0;
  width: 42%;
  background: #e34f76;
  border-radius: inherit;
}

.music-player__controls {
  display: flex;
  height: 9px;
  margin-top: 2px;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.music-player__controls > span {
  display: grid;
  width: 7px;
  height: 7px;
  color: #282128;
  place-items: center;
}

.music-player__controls .music-player__play {
  width: 9px;
  height: 9px;
  color: white;
  background: #29232a;
  border-radius: 50%;
}

.music-player__controls .music-player__play svg {
  width: 58%;
  height: 58%;
}

.music-player__controls svg {
  display: block;
  width: 100%;
  height: 100%;
  fill: currentcolor;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.15;
}

.dock-app:focus-visible,
.music-player__artwork:focus-visible {
  outline: 2px solid #147ce5;
  outline-offset: 2px;
}

.running-indicator {
  position: absolute;
  right: 0;
  bottom: -10px;
  left: 0;
  width: 4px;
  height: 4px;
  margin: auto;
  pointer-events: none;
  background: rgba(22, 22, 25, 0.76);
  border-radius: 50%;
  box-shadow: 0 0 0 0.5px rgba(255, 255, 255, 0.45);
}

:global(.dark) .running-indicator {
  background: rgba(255, 255, 255, 0.82);
}

.macos-dock.vertical .running-indicator {
  inset: 0 -6px 0 auto;
  margin: auto;
}

.macos-dock.vertical.left .running-indicator {
  inset: 0 auto 0 -6px;
}

dock-minimize-area::part(item) {
  cursor: default;
}

dock-minimize-area::part(button) {
  border-radius: 8px;
  cursor: default;
}

dock-minimize-area::part(thumbnail) {
  border-radius: 7px;
  cursor: default;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.32),
    inset 0 0 0 0.5px rgba(255, 255, 255, 0.45);
}

@media (prefers-reduced-motion: reduce) {
  .dock-app.is-music,
  .music-player,
  .music-player__artwork,
  .music-player__artwork img,
  .music-player__content {
    transition: none;
  }

  .music-player__vinyl {
    animation: none;
  }

  .music-player__content,
  .is-music-expanded .music-player__content {
    filter: none;
  }
}
</style>
