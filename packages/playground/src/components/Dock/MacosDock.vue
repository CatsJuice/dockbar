<script lang="ts" setup>
import 'dockbar'

const apps = [
  {
    icon: 'Files.jpg',
    name: 'Files',
  },
  {
    icon: 'App Store.jpg',
    name: 'App Store',
  },
  {
    icon: 'Freeform.jpg',
    name: 'FreeForm',
  },
  {
    icon: 'Keynote.jpg',
    name: 'Keynote',
  },
  {
    icon: 'Lofi-1.webp',
    name: 'Lofi',
    href: 'https://lofidot.com/',
  },
  {
    icon: 'Mail.jpg',
    name: 'Mail',
  },
  {
    icon: 'Messages.jpg',
    name: 'Messages',
  },
  {
    icon: 'Mindfulness.jpg',
    name: 'Mindfulness',
  },
  {
    icon: 'Music.jpg',
    name: 'Music',
  },
  {
    icon: 'Lofi-2.webp',
    name: 'Lofi',
    href: 'https://lofidot.com/',
  },
  {
    icon: 'TV.jpg',
    name: 'TV',
  },
]
</script>

<template>
  <div class="dock">
    <LightBorderFrame :border-width="1" radius="16">
      <dock-wrapper
        :size="config.size"
        :padding="config.padding"
        :gap="config.gap"
        :max-scale="config.maxScale"
        :max-range="config.maxRange"
        :disabled="config.disabled"
        :direction="config.direction"
        :position="config.position"
      >
        <dock-item v-for="app in apps" :key="app.icon">
          <a class="dock-item" flex="~ center" :href="app.href" target="_blank">
            <img :src="`/macos-icons/${app.icon}`" :alt="app.name">
          </a>
        </dock-item>
      </dock-wrapper>
    </LightBorderFrame>
  </div>
</template>

<style scoped>
.dock::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  backdrop-filter: blur(10px) saturate(180%);
  z-index: -1;
}
.dock-item {
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0px 1px 2px rgba(0,0,0,0.3);
}
</style>
