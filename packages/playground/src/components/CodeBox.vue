<script setup lang="ts">
import { computed, ref } from 'vue'
import { useClipboard } from '@vueuse/core'
import LanguageIcon from './LanguageIcon.vue'
import type { Code } from '~/types/lang'
import '~/styles/editor.scss'

const props = withDefaults(defineProps<{
  codes: Array<Code>
  radius: number
  noPadding?: boolean
  editorPadding?: string
  [key: string]: any
}>(), { radius: 10 })

const active = ref(0)
const { copy } = useClipboard()

const activeCode = computed(() => props.codes[active.value])

function onCopy(e: MouseEvent) {
  const el = e.target as HTMLElement
  const tooltip = document.createElement('div')
  const rect = el.getBoundingClientRect()
  tooltip.textContent = 'Copied!'
  tooltip.classList.add('tooltip')
  tooltip.style.position = 'fixed'
  tooltip.style.top = `${rect.top + rect.height + 12}px`
  tooltip.style.left = `${rect.left + rect.width / 2}px`
  tooltip.style.transform = 'translate(-50%, 0)'
  tooltip.style.zIndex = '99999'
  document.body.appendChild(tooltip)

  copy(activeCode.value.code)

  setTimeout(() => {
    tooltip.remove()
  }, 1000)
}

const radiusOut = computed(() => `${props.radius}px`)
const radiusIn = computed(() => `${props.radius - 4}px`)
</script>

<template>
  <div
    :style="{ borderRadius: radiusOut }"
    class="code-box"
    flex="~ col nowrap gap-2"
    relative rounded-3 overflow-hidden text-sm
    :class="noPadding ? '' : 'p2'"
    bg="dark-8/10"
    dark:bg="dark-8/10"
  >
    <header v-if="codes.length > 1" relative flex="~ gap-3" items-center w-full>
      <div
        v-for="({ lang, title }, index) in codes"
        :key="title || lang"
        cursor-pointer
      >
        <div
          data-cursor="block"
          :class="{ 'lang-tab--active': active === index }"
          class="lang-tab"
          flex="~ gap-2"
          transition="~ all"
          flex-center rounded-2 py1 font-500 text-white px2
          hover:bg="white/10"
          dark:hover:bg="white/5"
          @click="active = index"
        >
          <LanguageIcon :lang="lang" />
          <div v-if="title">
            {{ title }}
          </div>
          <div v-else capitalize>
            {{ lang }}
          </div>
        </div>
      </div>
    </header>

    <main
      dark:bg="dark-8/30"
      bg="dark-8/20"
      :style="{ borderRadius: radiusIn, padding: editorPadding }"
      flex="~ 1"
      data-cursor="text"
      w-full rounded-2 relative h-0 overflow-auto
    >
      <highlightjs
        :key="activeCode.lang"
        :language="activeCode.lang"
        :code="activeCode.code"
      />
    </main>
    <div
      class="icon-btn"
      data-cursor="block"
      p="1"
      :style="{ top: codes.length > 1 ? '52px' : '16px' }"

      flex-center text-sm cursor-pointer text-white right-12px absolute w-36px h-36px active:scale-90
      @click="onCopy"
    >
      <div i-carbon:copy />
    </div>
  </div>
</template>

<style>
.tooltip {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px) saturate(180%);
  color: white;
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}
.lang-tab {
  opacity: 0.8;
}
.lang-tab--active {
  opacity: 1;
  background-color: rgba(210, 210, 210, 0.4);
}

.hljs {
  background: rgba(0, 0, 0, 0) !important;
}
.hljs ::selection,
.code-box ::selection {
  background: rgba(255,255,255, 0.3)
}
</style>
