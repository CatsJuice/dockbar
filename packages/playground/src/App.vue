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
      content: () => isDark.value ? '#F77D5C' : '#ffffff',
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
  <RouterView />
</template>
