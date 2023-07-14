<script setup lang="ts">
defineOptions({
  name: 'IndexPage',
})

const paneCon = ref<HTMLElement>()

onMounted(() => {
  const { pane } = usePane(paneCon.value!)
  pane.addInput(config, 'size', { min: 10, max: 100, step: 1 })
  pane.addInput(config, 'padding', { min: 0, max: 50, step: 1 })
  pane.addInput(config, 'gap', { min: 0, max: 50, step: 1 })
  pane.addInput(config, 'maxScale', { min: 1, max: 5, step: 0.1 })
  pane.addInput(config, 'maxRange', { min: 10, max: 800, step: 10 })
  // pane.addInput(config, 'direction', {
  //   options: {
  //     horizontal: 'horizontal', vertical: 'vertical',
  //   },
  // })
  pane.addInput(config, 'position', {
    options: {
      top: 'top', right: 'right', bottom: 'bottom', left: 'left',
    },
  }).on('change', ({ value }) => {
    config.direction = (value === 'top' || value === 'bottom') ? 'horizontal' : 'vertical'
  })
  pane.addInput(config, 'disabled')
})
</script>

<template>
  <div full bg-cover style="background-image: url('/sonoma.webp')">
    <div ref="paneCon" fixed left="1/2" top="1/2" translate-x="-1/2" translate-y="-1/2" />
    <ClientOnly>
      <Dock />
    </ClientOnly>
  </div>
</template>
