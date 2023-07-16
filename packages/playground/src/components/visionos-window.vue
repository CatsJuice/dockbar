<script lang="ts" setup>
import { getSize } from '../utils/getSize'

interface Props {
  width?: number | string
  height?: number | string
}
const props = withDefaults(defineProps<Props>(), {})

const wrapperStyle = computed(() => ({
  width: getSize(props.width!),
  height: getSize(props.height!),
}))
</script>

<template>
  <LightBorderFrame
    radius="50"
    class="visionos-window blur-shadow-small" :style="wrapperStyle"
  >
    <slot />
  </LightBorderFrame>
</template>
