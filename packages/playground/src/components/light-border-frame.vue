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

const style = computed(() => ({
  '--light-border-radius': getSize(props.radius),
  '--light-border-width': `${props.borderWidth}px`,
}))
</script>

<template>
  <div relative :style="style" class="light-border-frame">
    <slot />
  </div>
</template>

<style scoped>
.light-border-frame {
  border-radius: var(--light-border-radius);
}

.light-border-frame::before {
  position: absolute;
  border-radius: inherit;
  padding: var(--light-border-width);
  background: linear-gradient(
    156deg,
    rgba(255, 255, 255, 0.4) 0%,
    rgba(255, 255, 255, 0.01) 40.5687%,
    rgba(255, 255, 255, 0.01) 57.4372%,
    rgba(255, 255, 255, 0.1) 100%
  );
  content: "";
  inset: 0;
  pointer-events: none;
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
}
</style>
