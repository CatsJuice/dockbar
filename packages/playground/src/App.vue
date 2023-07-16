<script setup lang="ts">
// useCursor({
//   enableAutoTextCursor: true,
//   enableLighting: true,
//   blockStyle: {
//     radius: 'auto',
//   },
// })
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
</script>

<template>
  <div full>
    <transition name="fade">
      <div
        v-if="!isDark"
        fixed bg-cover bg-center bg-no-repeat inset-0
        :style="{ backgroundImage: `url('/room-day.webp')` }"
      />

      <div
        v-else
        fixed bg-cover bg-center bg-no-repeat inset-0
        :style="{ backgroundImage: `url('/room-night.webp')` }"
      />
    </transition>
    <RouterView relative z-1 />
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
