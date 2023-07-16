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
  <transition name="fadeInBottom">
    <component
      :is="dockRender"
      :key="activeStyle"
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

.fadeInBottom-enter-active {
  transition: all 0.23s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s;
}
.fadeInBottom-enter-from,
.fadeInBottom-leave-to {
  --translate-y: 50px !important;
  opacity: 0;
}
.fadeInBottom-enter-to {
  --translate-y: 0;
  opacity: 1;
}
.fadeInBottom-leave-active {
  transition: all 0.23s cubic-bezier(0.6, -0.28, 0.735, 0.045);
}
</style>
