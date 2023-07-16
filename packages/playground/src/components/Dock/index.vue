<script setup lang="ts">
const CatsJuiceDock = defineAsyncComponent(() => import('./CatsJuiceDock.vue'))
const MacosDock = defineAsyncComponent(() => import('./MacosDock.vue'))
const RaunoDock = defineAsyncComponent(() => import('./RaunoDock.vue'))

const dockRender = computed(() => ({
  default: CatsJuiceDock,
  macos: MacosDock,
  rauno: RaunoDock,
})[activeStyle.value] || 'div')
</script>

<template>
  <transition>
    <component
      :is="dockRender"
      class="dock"
      :class="{ [config.position]: true, [config.direction]: true }"
    />
  </transition>
</template>

<style>
.dock {
  --translate-x: 0;
  --translate-y: 0;
  transform: translate(var(--translate-x), var(--translate-y));
}

/* position */
.dock.bottom,
.dock.top {
  left: 50%;
  --translate-x: -50%;
}
.dock.left,
.dock.right {
  top: 50%;
  --translate-y: -50%;
}
</style>
