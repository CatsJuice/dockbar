<script lang="ts" setup>
const paneCon = ref<HTMLElement>()

onMounted(() => {
  const { pane } = usePane(paneCon.value!)
  pane.addBinding(config, 'size', { min: 10, max: 100, step: 1 })
  pane.addBinding(config, 'padding', { min: 0, max: 50, step: 1 })
  pane.addBinding(config, 'gap', { min: 0, max: 50, step: 1 })
  pane.addBinding(config, 'maxScale', { min: 1, max: 5, step: 0.1 })
  pane.addBinding(config, 'maxRange', { min: 10, max: 800, step: 10 })
  pane.addBinding(config, 'position', {
    options: {
      top: 'top', right: 'right', bottom: 'bottom', left: 'left',
    },
  }).on('change', ({ value }: { value: string }) => {
    config.direction = (value === 'top' || value === 'bottom') ? 'horizontal' : 'vertical'
  })
  pane.addBinding(config, 'disabled')
  pane.addBinding(config, 'sortable')
  pane.addBinding(config, 'allowDragDelete')
})
</script>

<template>
  <div
    ref="paneCon"
    filter-invert-10 dark:filter-contrast-100 dark:filter-invert-0
  />
</template>
