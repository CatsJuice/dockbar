<script setup lang="ts">
defineProps<{ lang: string }>()
</script>

<template>
  <span
    class="language-icon"
    :class="{ 'language-icon--npm': lang === 'npm' }"
    :data-language-icon="lang"
    aria-hidden="true"
  >
    <div v-if="lang === 'vue'" i-logos:vue />
    <div v-else-if="lang === 'js'" i-logos:javascript />
    <div v-else-if="lang === 'ts'" i-logos:typescript-icon />
    <div v-else-if="lang === 'html'" i-vscode-icons:file-type-html />
    <div v-else-if="lang === 'npm'" i-logos:npm />
    <div v-else-if="lang === 'yarn'" i-logos:yarn />
    <div v-else-if="lang === 'pnpm'" i-logos:pnpm />
    <div v-else-if="lang === 'react'" i-logos:react />
  </span>
</template>

<style scoped>
.language-icon {
  display: grid;
  flex: 0 0 1.25em;
  width: 1.25em;
  height: 1.25em;
  overflow: hidden;
  place-items: center;
}

.language-icon--npm > div {
  width: 100%;
  height: 100%;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: contain;
}
</style>
