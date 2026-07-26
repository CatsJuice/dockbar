<script setup lang="ts">
useHead({
  title: 'Dockbar - Playground',
  meta: [
    { name: 'description', content: 'macOS-like dock component made by web-components' },
    {
      name: 'theme-color',
      content: () => isDark.value ? '#222222' : '#ffffff',
    },
  ],
  link: [
    {
      rel: 'icon',
      type: 'image/svg+xml',
      href: () => preferredDark.value ? '/dockbar.svg' : '/dockbar.svg',
    },
  ],
})

const $background = ref<HTMLElement>()
const parallaxDistance = 10
let pointerX = 0
let pointerY = 0
let parallaxFrame: number | undefined
let parallaxReady = false

function updateParallax() {
  parallaxFrame = undefined

  const background = $background.value
  if (!background)
    return

  const centerX = window.innerWidth / 2
  const centerY = window.innerHeight / 2
  const offsetX = centerX ? (pointerX - centerX) / centerX * parallaxDistance : 0
  const offsetY = centerY ? (pointerY - centerY) / centerY * parallaxDistance : 0

  background.style.transform = `translate3d(${-offsetX}px, ${-offsetY}px, 0)`
}

function queueParallaxUpdate() {
  if (parallaxReady && parallaxFrame === undefined)
    parallaxFrame = window.requestAnimationFrame(updateParallax)
}

function onMousemove(event: MouseEvent) {
  pointerX = event.clientX
  pointerY = event.clientY
  queueParallaxUpdate()
}

onMounted(() => {
  pointerX = window.innerWidth / 2
  pointerY = window.innerHeight / 2
  parallaxReady = true
  window.addEventListener('mousemove', onMousemove, { passive: true })
  window.addEventListener('resize', queueParallaxUpdate, { passive: true })
})

watch(isDark, queueParallaxUpdate, { flush: 'post' })

onBeforeUnmount(() => {
  parallaxReady = false
  window.removeEventListener('mousemove', onMousemove)
  window.removeEventListener('resize', queueParallaxUpdate)

  if (parallaxFrame !== undefined)
    window.cancelAnimationFrame(parallaxFrame)
})
</script>

<template>
  <div full>
    <transition name="fade">
      <div
        v-if="!isDark"
        ref="$background"
        class="parallax-background"
        fixed bg-cover bg-center bg-no-repeat
        :style="{ backgroundImage: `url('/room-day.webp')`, inset: `-${parallaxDistance}px` }"
      />

      <div
        v-else
        ref="$background"
        class="parallax-background"
        fixed bg-cover bg-center bg-no-repeat
        :style="{ backgroundImage: `url('/room-night.webp')`, inset: `-${parallaxDistance}px` }"
      />
    </transition>
    <div full relative z-1>
      <RouterView />
    </div>
  </div>
</template>

<style>
.parallax-background {
  transform: translate3d(0, 0, 0);
  will-change: transform;
}

.fade-enter-active {
  transition: opacity 1.5s;
}
.fade-leave-active {
  transition: opacity 2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
