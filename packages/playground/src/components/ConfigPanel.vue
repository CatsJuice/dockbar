<script lang="ts" setup>
const paneCon = ref<HTMLElement>()

onMounted(() => {
  const { pane } = usePane(paneCon.value!)
  pane.addInput(config, 'size', { min: 10, max: 100, step: 1 })
  pane.addInput(config, 'padding', { min: 0, max: 50, step: 1 })
  pane.addInput(config, 'gap', { min: 0, max: 50, step: 1 })
  pane.addInput(config, 'maxScale', { min: 1, max: 5, step: 0.1 })
  pane.addInput(config, 'maxRange', { min: 10, max: 800, step: 10 })
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
  <div
    ref="paneCon"
    dark:filter-invert-0 dark:filter-contrast-100 filter-invert-10
  />
</template>
