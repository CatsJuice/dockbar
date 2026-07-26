<script lang="ts" setup>
import { useCode } from '../composables/code'
import CodeBox from '~/components/CodeBox.vue'
import dockbarSvg from '~/assets/dockbar.svg?raw'

const code = useCode()
const $el = ref<HTMLElement>()

const { width } = useElementBounding($el)

// Avoid a raw less-than comparison here: UnoCSS's Attributify extractor can
// interpret it as the start of an HTML tag and skip later valueless attributes.
const wrap = computed(() => !(width.value >= 750))
const packageName = 'dockbar'

const installCodes = [
  {
    lang: 'pnpm',
    title: 'PNPM',
    code: `pnpm i ${packageName}`,
  },
  {
    lang: 'npm',
    title: 'NPM',
    code: `npm i ${packageName} --save`,
  },
  {
    lang: 'yarn',
    title: 'Yarn',
    code: `yarn add ${packageName}`,
  },
]
</script>

<template>
  <div
    ref="$el"
    full flex flex-nowrap justify-between gap-2 overflow-hidden rounded-inherit p2
    :style="{
      // paddingBottom: `${config.size / 2 + 5 + config.padding}px`,
      flexDirection: wrap ? 'column' : 'row',
      overflowY: wrap ? 'auto' : 'hidden',
      alignItems: wrap ? 'center' : 'flex-start',
    }"
  >
    <div
      data-testid="home-sidebar"
      flex="~ col"
      :class="wrap
        ? ['items-center', 'h-fit']
        : ['h-full', 'w0', 'flex-1', 'overflow-y-auto', 'max-w-350px', 'min-w-200px']"
      shrink-0 justify-between gap-5 p8 pb0
    >
      <div
        text-white
        flex="~ col"
        :class="wrap ? ['items-center'] : []"
      >
        <MagicCard w-100px>
          <!-- <img w-100px src="/dockbar.svg"> -->
          <div h-100px w-100px v-html="dockbarSvg" />
        </MagicCard>
        <h1 mt-4 text-3xl font-bold>
          Dockbar
        </h1>
        <p opacity-70>
          A macOS like dockbar component built with
          <a underline href="https://developer.mozilla.org/en-US/docs/Web/API/Web_components" target="_blank">Web-Components</a>
          (<a underline target="_blank" href="https://lit.dev/">Lit</a> based)
        </p>

        <p mt-2 text-sm opacity-70>
          This library was inspired by
          <a href="https://rauno.me/" target="_blank" underline>
            rauno's website
          </a>
        </p>

        <a
          mt-2 text-xs underline opacity-70 hover:opacity-80
          href="https://github.com/CatsJuice/dockbar"
          target="_blank"
        >
          <div flex="~ items-center" gap-2>
            <div>Documentation</div>
            <div class="breath" i-fa6-solid:arrow-right />
          </div>
        </a>
      </div>

      <div flex="~ col" max-w-350px w-full text-white :class="wrap ? ['items-stretch'] : []">
        <div pb1 text-lg font-500 :class="wrap ? ['text-center'] : []">
          Install
        </div>
        <CodeBox :radius="12" :codes="installCodes" />

        <div mt4 pb1 text-lg font-500 :class="wrap ? ['text-center'] : []">
          Configurations
        </div>
        <ConfigPanel class="glass" :class="wrap ? [] : ['w-full']" />
      </div>
    </div>

    <LightBorderFrame
      shrink-0
      :border-width="1"
      :radius="40"
      :class="wrap ? ['w-full', 'h-fit'] : ['w-0', 'flex-3', 'h-full']"
    >
      <CodeBox

        no-padding full
        :radius="40" :codes="[{ lang: 'html', code }]"
        editor-padding="20px"
      />
    </LightBorderFrame>
  </div>
</template>

<style lang="sass">
.glass .tp-rotv
  box-shadow: none
  border-radius: 12px
  overflow: hidden
  background: rgba(0,0,0, 0.45)
.dark .glass .tp-rotv
  background: rgba(0,0,0,0.1)

.breath
  animation: breath 3s infinite alternate
  @keyframes breath
    0%
      transform: translateX(0) scaleX(1)
    50%
      transform: translateX(5px) scaleX(1.2)
    100%
      transform: translateX(0) scaleX(1)
</style>
