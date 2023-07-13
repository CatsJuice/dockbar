<script setup lang="ts">
defineOptions({
  name: 'IndexPage',
})

const { t } = useI18n()
</script>

<template>
  <div bg-red text-white>
    <h1>{{ t('hello') }}</h1>
  </div>
</template>
