<script lang="ts" setup>
import { swingUp } from '~/anims/swing-up'

interface Props {
  playing: boolean
}
const props = withDefaults(defineProps<Props>(), {})

const $el = ref<HTMLElement>()
const pendingTimers = new Set<number>()
const activeAnimations = new Map<HTMLElement, () => void>()
let stopPlayingWatch: (() => void) | undefined
let running = false
let generation = 0

onMounted(() => {
  stopPlayingWatch = watch(() => props.playing, (playing) => {
    if (playing)
      start()
    else
      stop()
  }, { immediate: true })
})

onBeforeUnmount(() => {
  stopPlayingWatch?.()
  stop()
})

function schedule(callback: () => void, delay: number) {
  const timer = window.setTimeout(() => {
    pendingTimers.delete(timer)
    callback()
  }, delay)
  pendingTimers.add(timer)
}

function isCurrent(token: number) {
  return running && props.playing && token === generation
}

function start() {
  if (running || !$el.value)
    return

  running = true
  const token = ++generation

  for (let i = 0; i < 5; i++)
    runChain(token)
}

function runChain(token: number) {
  schedule(() => {
    if (!isCurrent(token))
      return

    createNote()
    schedule(() => runChain(token), Math.random() * 1000)
  }, Math.random() * 1000)
}

function createNote() {
  const container = $el.value
  if (!container)
    return

  const node = document.createElement('div')
  node.setAttribute(Math.random() > 0.5 ? 'i-mdi:music' : 'i-mdi:music-note', '')
  node.style.setProperty('position', 'absolute')
  container.appendChild(node)

  const cancel = swingUp({
    target: node,
    speed: 30 + Math.random() * 20,
    diffusion: 1 + Math.random() * 2,
    xRange: (Math.random() > 0.5 ? -1 : 1) * (5 + Math.random() * 5),
    yRange: 10 + Math.random() * 10,
    startScale: Math.random() * 0.5,
    endScale: Math.random() * 0.4,
    once: true,
    onEnd: () => {
      activeAnimations.delete(node)
      node.remove()
    },
  })
  activeAnimations.set(node, cancel)
}

function stop() {
  running = false
  generation++

  for (const timer of pendingTimers)
    window.clearTimeout(timer)
  pendingTimers.clear()

  for (const [node, cancel] of activeAnimations) {
    cancel()
    node.remove()
  }
  activeAnimations.clear()
}
</script>

<template>
  <div ref="$el" text="green/40">
    <div absolute i-mdi:music invisible />
    <div absolute invisible i-mdi:music-note />
  </div>
</template>
