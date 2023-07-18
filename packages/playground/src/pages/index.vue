<script setup lang="ts">
import Home from '~/views/Home.vue'

defineOptions({
  name: 'IndexPage',
})
const Dock = defineAsyncComponent(() => import('~/components/Dock/index.vue'))
const $window = ref<HTMLElement>()

const { left, top, right, bottom } = useElementBounding($window)

const dockStyle = computed(() => {
  if (config.position === 'bottom')
    return { 'top': `${bottom.value}px`, '--translate-y': '-50%' }
  if (config.position === 'top')
    return { 'top': `${top.value}px`, '--translate-y': '-50%' }
  if (config.position === 'left')
    return { 'left': `${left.value}px`, '--translate-x': '-50%' }
  if (config.position === 'right')
    return { 'left': `${right.value}px`, '--translate-x': '-50%' }
  return {}
})
</script>

<template>
  <div full flex-center>
    <StyleTab
      class="!fixed"
      top="1/2"
      translate-y="-1/2" translate-x="-80px" :style="{ left: `${left}px` }"
    />
    <div ref="$window">
      <VisionosWindow width="80vw" height="80vh" relative max-w-1200px>
        <Home />
      </VisionosWindow>
    </div>
  </div>
  <client-only>
    <Dock :style="dockStyle" fixed />
  </client-only>
</template>

<style>
.tp-rotv_b {
  pointer-events: none;
}
</style>
