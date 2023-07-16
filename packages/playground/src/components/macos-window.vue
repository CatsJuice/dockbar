<script setup lang="ts">
interface Props {
  width?: number | string
  height?: number | string
}

const props = defineProps<Props>()
const size = (v: number | string) => typeof v === 'number' || /^\d+$/.test(v) ? `${v}px` : `${v}`
const isActive = ref(false)
const zIndex = ref<number | undefined>(undefined)
const dragHandle = ref<HTMLElement>()
const offset = ref({ x: 0, y: 0 })
const dragStartPos = { x: 0, y: 0 }
const dragging = ref(false)

onMounted(() => {
  window.addEventListener('mousemove', onMove)
  window.addEventListener('blur', onMoveEnd)
  window.addEventListener('mouseleave', onMoveEnd)
})
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('blur', onMoveEnd)
  window.removeEventListener('mouseleave', onMoveEnd)
})

watchEffect(() => zIndex.value = isActive.value ? 9999 : undefined)

const style = computed(() => ({
  width: size(props.width!),
  height: size(props.height!),
  zIndex: zIndex.value,
  transform: `translate(calc(-50% + ${offset.value.x}px), calc(-50% + ${offset.value.y}px))`,
}))

function active() {
  isActive.value = true
}

function onMoveStart(e: MouseEvent) {
  dragging.value = true
  dragStartPos.x = e.clientX - offset.value.x
  dragStartPos.y = e.clientY - offset.value.y
}
function onMove(e: MouseEvent) {
  if (!dragging.value)
    return
  offset.value = {
    x: e.clientX - dragStartPos.x,
    y: e.clientY - dragStartPos.y,
  }
}
function onMoveEnd() {
  dragging.value = false
}

defineExpose({ active, isActive })
</script>

<template>
  <div
    left="1/2" top="1/2"
    class="window-frame" fixed bg-white rounded-12px dark:bg-dark-8
    transition-background-color duration-1000
    :style="style"
  >
    <header
      ref="dragHandle"
      absolute
      top-0
      pt-3 px-3 w-full
      @mousedown="onMoveStart"
      @mouseup="onMoveEnd"
    >
      <div class="traffic" flex="~ " items-center gap-2>
        <div cursor-not-allowed class="action close" />
        <div cursor-not-allowed class="action minimize" />
        <div cursor-not-allowed class="action zoom" />
      </div>
    </header>
    <slot />
  </div>
</template>

<style scoped>
.window-frame {
  box-shadow: 0px 0px 10px rgba(0,0,0,0.4),
  0px 2px 4px rgba(0,0,0,0.07),
  0px 0px 40px rgba(0,0,0,0.1);
}
.traffic .action {
  --color-1: #D5D4D4;
  --color-2: #D5D4D4;
}
.dark .traffic .action {
  --color-1: rgba(255,255,255,.1);
  --color-2: rgba(255,255,255,.1);
}
.traffic:hover .close {
  --color-1: #68100980;
  --color-2: #ED6C5F;
}
.traffic:hover .minimize {
  --color-1: #8F591D80;
  --color-2: #F5BF4F;
}
.traffic:hover .zoom {
  --color-1: #28601880;
  --color-2: #64CA57;
}
.traffic .action {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-2);
  color: var(--color-1);
  border: 0.5px solid var(--color-1);
}
</style>
