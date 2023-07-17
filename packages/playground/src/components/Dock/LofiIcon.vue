<script lang="ts" setup>
import { swingUp } from '../../anims/swing-up'

const bgStyle = {
  backgroundImage: 'url("/lofi/lofi-bg@0.5x.webp")',
  borderRadius: 'inherit',
}
const lofiCD = {
  backgroundImage: 'url("/lofi/lofi-cd@0.5x.webp")',
}

const $swing1 = ref<HTMLElement>()
const hovered = ref(false)

swingUp({
  target: $swing1,
})
</script>

<template>
  <div
    class="group bg"
    :style="bgStyle"
    relative full bg-no-repeat bg-center bg-cover z-2
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <MusicAnim absolute right="1/2" top="0" :playing="hovered" />
    <div
      class="cd"
      w="2.8/5" h="2.8/5"
      :style="lofiCD"
      right="2/40"
      top="2/40"
      bg-no-repeat bg-center bg-cover absolute rounded-full transition-all z-10
      group-hover:top="-1"
      group-hover:right="-1"
      group-hover:w="7/10"
      group-hover:h="7/10"
    />
  </div>
</template>

<style scoped>
.cd {
  animation: rotate 20s linear infinite;
  animation-play-state: paused;
}
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.bg:hover .cd {
  animation-play-state: running;
}

.bg {
  transition: box-shadow 0.3s ease-in-out;
  transition-delay: 0s;
}
.bg:hover {
  transition-delay: 0.23s;
  box-shadow:
  0px 2px 3px rgba(10, 200, 40, 0.3),
  0px 0px 40px rgba(0, 150, 0, 0.7),
  0px 10px 100px rgba(10, 230, 30, 1);
}
</style>
