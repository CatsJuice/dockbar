<script lang="ts" setup>
import { swingUp } from '~/anims/swing-up'

interface Props {
  playing: boolean
}
const props = withDefaults(defineProps<Props>(), {})

const $el = ref<HTMLElement>()

onMounted(() => {
  watch(() => props.playing, (playing) => {
    if (playing)
      play()
  }, { immediate: true })
})

async function play() {
  if (!$el.value)
    return
  const sum = 5

  async function anim() {
    if (!$el.value)
      return
    const delay = Math.random() * 1000
    await new Promise(resolve => setTimeout(resolve, delay))
    const node = document.createElement('div')
    if (Math.random() > 0.5)
      node.setAttribute('i-mdi:music', '')
    else
      node.setAttribute('i-mdi:music-note', '')

    node.style.setProperty('position', 'absolute')
    $el.value.appendChild(node)
    swingUp({
      target: node,
      speed: 30 + Math.random() * 20,
      diffusion: 1 + Math.random() * 2,
      xRange: (Math.random() > 0.5 ? -1 : 1) * (5 + Math.random() * 5),
      yRange: 10 + Math.random() * 10,
      startScale: Math.random() * 0.5,
      endScale: Math.random() * 0.4,
      once: true,
      onEnd: () => {
        $el.value?.removeChild(node)
      },
    })
    if (props.playing)
      setTimeout(() => anim(), Math.random() * 1000)
  }
  for (let i = 0; i < sum; i++)
    anim()
}
</script>

<template>
  <div ref="$el" text="green/40">
    <div absolute i-mdi:music invisible />
    <div absolute invisible i-mdi:music-note />
  </div>
</template>
