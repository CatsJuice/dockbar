<script lang="ts" setup>
const card = ref()
const transform = ref('none')
const transformShadow = ref('none')
const highlightStyle = ref({ transform: 'none', opacity: '0' })

function handleMouseover(e: MouseEvent) {
  if (!card.value)
    return
  const cX = e.clientX
  const cY = e.clientY
  const dim = card.value.getBoundingClientRect()
  const eX = cX - dim.left
  const eY = cY - dim.top
  const w = dim.width / 2
  const h = dim.height / 2
  const tiltLimit = 15
  const posX = (h - eY) * (tiltLimit / h)
  const posY = (w - eX) * (tiltLimit / w) * -1

  transform.value = `rotateX(${posX}deg) rotateY(${posY}deg)`
  transformShadow.value = `${posY * -1}px ${
    posX + 14
  }px 24px 0 rgba( 0, 0, 0, 0.02 )`
  highlightStyle.value = {
    transform: `translate3d(${posX * -4}px, ${posY * -4}px, 0)`,
    opacity: '1',
  }
}
function handleMouseout() {
  transform.value = 'none'
  transformShadow.value = 'none'
  highlightStyle.value = { transform: 'none', opacity: '0' }
}
</script>

<template>
  <div
    ref="card"
    class="magic-hover-card"
    @mousemove="handleMouseover"
    @mouseleave="handleMouseout"
  >
    <div
      class="fit magic-hover-card-mask"
      :style="{
        transform,
        boxShadow: transformShadow,
        transition: 'all 0.1s ease',
      }"
    >
      <div class="fit relative-position magic-hover-card-display">
        <slot />
      </div>
      <!-- <div class="magic-hover-card-highlight-mask fit absolute">
        <div class="magic-hover-card-highlight" :style="highlightStyle"></div>
      </div> -->
    </div>
  </div>
</template>

<style lang="scss" scoped>
.magic-hover-card {
  border-radius: 12px;
  position: relative;
  cursor: pointer;

  perspective: 600px;
  perspective-origin: 50% 50%;
  transform-style: preserve-3d;

  &-display {
    z-index: 1;
    border-radius: inherit;
    /* box-shadow: 0px 20px 20px rgba(0, 0, 0, 0.02),
      0px 10px 40px rgba(0, 0, 0, 0.03); */
  }
  &-mask {
    border-radius: inherit;
  }
  &-highlight-mask {
    left: 0;
    top: 0;
    border-radius: inherit;
    position: absolute;
    overflow: hidden;
  }
  &-highlight {
    display: block;
    position: absolute;
    width: 400px;
    height: 400px;
    top: 0;
    right: 0;
    opacity: 0;
    z-index: -1;
    transition: opacity 0.25s ease;
    /* background: radial-gradient(
      150px at 50%,
      rgba(255, 255, 255, 0.13) 0%,
      rgba(255, 255, 255, 0) 100%
    ); */
  }
}
</style>
