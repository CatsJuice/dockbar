<script lang="ts" setup>
const styles = [{
  name: 'default',
  icon: 'i-fa6-solid:c',
}, {
  name: 'macos',
  icon: 'i-fa6-solid:a',
}, {
  name: 'rauno',
  icon: 'i-fa6-solid:r',
}]

const indicatorY = ref(12)
const $route = useRoute()

watch(() => $route.query.style, (style) => {
  const index = styles.findIndex(s => s.name === style)
  if (index === -1)
    return
  indicatorY.value = index * 44 + (index + 1) * 12
}, { immediate: true })
</script>

<template>
  <LightBorderFrame
    class="tab-wrapper"
    radius="34" p-12px
    flex="~ col nowrap" gap-12px
  >
    <div
      duration="100ms"
      w-44px h-44px rounded-full absolute transition transition-top
      class="tab-indicator"
      :style="{ top: `${indicatorY}px` }"
    />
    <router-link
      v-for="style in styles"
      :key="style.name"
      relative
      flex="~ center"
      class="tab" w-44px h-44px rounded-full
      text-white
      cursor-pointer
      :to="{ query: { style: style.name } }"
    >
      <div :class="style.icon" />
    </router-link>
  </LightBorderFrame>
</template>

<style scoped>
.tab-wrapper {
  background: var(--windows-glass, rgba(128, 128, 128, 0.30));
  background-blend-mode: luminosity;
  /* Blur */
  backdrop-filter: blur(50px);
}
.tab:hover {
  background: linear-gradient(0deg, rgba(94, 94, 94, 0.18) 0%, rgba(94, 94, 94, 0.18) 100%), rgba(255, 255, 255, 0.03);
  background-blend-mode: color-dodge, normal;
}
.tab-indicator {
  background: linear-gradient(0deg, rgba(94, 94, 94, 0.18) 0%, rgba(94, 94, 94, 0.18) 100%), rgba(255, 255, 255, 0.07);
  background-blend-mode: color-dodge, normal;
  }
</style>
