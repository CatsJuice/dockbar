<script setup lang="ts">
import { isClient } from '@vueuse/shared'

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
const { x, y } = useMouse()
const parallaxDistance = 10

const bgPosition = computed(() => {
  if (!isClient)
    return {}
  const screenCenter = [
    window.innerWidth / 2,
    window.innerHeight / 2,
  ]
  const mousePosition = [x.value, y.value]
  const diff = [
    mousePosition[0] - screenCenter[0],
    mousePosition[1] - screenCenter[1],
  ]
  const ratio = [
    diff[0] / screenCenter[0],
    diff[1] / screenCenter[1],
  ]
  const position = [
    ratio[0] * parallaxDistance,
    ratio[1] * parallaxDistance,
  ]
  return {
    backgroundPosition: `calc(50% - ${position[0]}px) calc(50% - ${position[1]}px)`,
    inset: `-${parallaxDistance}px`,
  }
})
</script>

<template>
  <div full>
    <transition name="fade">
      <div
        v-if="!isDark"
        fixed bg-cover bg-center bg-no-repeat
        :style="{ backgroundImage: `url('/room-day.webp')`, ...bgPosition }"
      />

      <div
        v-else
        fixed bg-cover bg-center bg-no-repeat
        :style="{ backgroundImage: `url('/room-night.webp')`, ...bgPosition }"
      />
    </transition>
    <div full relative z-1>
      <RouterView />
    </div>
  </div>
</template>

<style>
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
