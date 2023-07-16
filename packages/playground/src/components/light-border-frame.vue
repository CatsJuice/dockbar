<script lang="ts" setup>
import { getSize } from '~/utils/getSize'

interface Props {
  radius?: number | string
  borderWidth?: number
}
const props = withDefaults(defineProps<Props>(), {
  radius: 40,
  borderWidth: 1.4,
})

const $el = ref<HTMLElement>()
const { width, height } = useElementBounding($el)

const style = computed(() => ({
  borderRadius: getSize(props.radius!),
}))
</script>

<template>
  <div ref="$el" relative :style="style" class="light-border-frame">
    <svg
      absolute top-0 left-0
      :width="width" :height="height"
      :view-box="`0 0 ${width} ${height}`"
      xmlns="http://www.w3.org/2000/svg"
      pointer-events-none
    >
      <rect
        :x="borderWidth / 2"
        :y="borderWidth / 2"
        :width="Math.max(0, width - borderWidth)"
        :height="Math.max(0, height - borderWidth)"
        :rx="radius" :ry="radius"
        fill="none" :stroke-width="borderWidth"
        stroke="url(#gradient-border)"
      />

      <defs>
        <linearGradient id="gradient-border" x1="15.2088" y1="1.99996" x2="91.4388" y2="177.493" gradientUnits="userSpaceOnUse">
          <stop stop-color="white" stop-opacity="0.4" />
          <stop offset="0.405687" stop-color="white" stop-opacity="0.01" />
          <stop offset="0.574372" stop-color="white" stop-opacity="0.01" />
          <stop offset="1" stop-color="white" stop-opacity="0.1" />
        </linearGradient>
      </defs>
    </svg>
    <slot />
  </div>
</template>

<style scoped>
</style>
