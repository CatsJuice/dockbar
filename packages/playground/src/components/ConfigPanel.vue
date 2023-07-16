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

    fixed filter-contrast-140 dark:filter-invert-0 filter-invert-90 dark:filter-contrast-100 w-300px
    left="1/2" top="1/2" translate-x="-1/2" translate-y="-1/2"
  />
</template>
