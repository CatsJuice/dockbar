<script lang="ts" setup>
import { useCode } from '../composables/code'
import CodeBox from '~/components/CodeBox.vue'

const code = useCode()
const $el = ref<HTMLElement>()

const { width } = useElementBounding($el)

const wrap = computed(() => width.value < 750)
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
    overflow-hidden full p2 justify-between flex rounded-inherit flex-nowrap gap-2
    :style="{
      // paddingBottom: `${config.size / 2 + 5 + config.padding}px`,
      flexDirection: wrap ? 'column' : 'row',
      overflowY: wrap ? 'auto' : 'hidden',
      alignItems: wrap ? 'center' : 'flex-start',
    }"
  >
    <div
      flex="~ col"
      :class="wrap
        ? ['items-center', 'h-fit']
        : ['h-full', 'w0', 'flex-1', 'overflow-y-auto', 'max-w-350px', 'min-w-200px']"
      justify-between shrink-0 p8 gap-5 pb0
    >
      <div
        text-white
        flex="~ col"
        :class="wrap ? ['items-center'] : []"
      >
        <img w-100px src="/dockbar.svg">
        <h1 font-bold text-3xl mt-4>
          Dockbar
        </h1>
        <p opacity-70>
          A macOS like dockbar component made with Web-Components
        </p>

        <p opacity-70 text-sm mt-2>
          This project was heavily inspired by
          <a href="https://rauno.me/" target="_blank" underline>
            rauno's personal website
          </a>
        </p>

        <a
          opacity-70 underline text-xs hover:opacity-80 mt-1
          href="https://github.com/CatsJuice/dockbar"
        >
          <div flex="~ items-center" gap-2>
            <div>Documentation</div>
            <div class="breath" i-fa6-solid:arrow-right />
          </div>
        </a>
      </div>

      <div flex="~ col" text-white w-full max-w-350px :class="wrap ? ['items-stretch'] : []">
        <div font-500 pb1 text-lg :class="wrap ? ['text-center'] : []">
          Install
        </div>
        <CodeBox :radius="12" :codes="installCodes" />

        <div text-lg font-500 pb1 mt4 :class="wrap ? ['text-center'] : []">
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
        full
        no-padding
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
