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
    overflow-hidden full p2 justify-between flex rounded-inherit flex-nowrap gap-8
    :style="{
      paddingBottom: `${config.size / 2 + 5 + config.padding}px`,
      flexDirection: wrap ? 'column' : 'row',
      overflowY: wrap ? 'auto' : 'hidden',
      alignItems: wrap ? 'center' : 'flex-start',
    }"
  >
    <div
      flex="~ col"
      :class="wrap ? ['items-center', 'h-fit'] : ['h-full', 'w0', 'flex-1']"
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

        <a
          opacity-70 text-xs hover:opacity-80 mt-3 underline
          href="https://github.com/CatsJuice/dockbar"
        >
          <div flex="~ items-center" gap-2>
            <div>Documentation</div>
            <div i-fa6-solid:arrow-right />
          </div>
        </a>
      </div>

      <div flex="~ col" w-full gap-4 max-w-350px :class="wrap ? ['items-stretch'] : []">
        <div font-500 text-xl :class="wrap ? ['text-center'] : []">
          Install
        </div>
        <CodeBox :radius="20" :codes="installCodes" />

        <div text-xl font-500 :class="wrap ? ['text-center'] : []">
          Configurations
        </div>
        <ConfigPanel class="glass" :class="wrap ? [] : ['w-full']" />
      </div>
    </div>

    <CodeBox
      shrink-0
      :radius="40" :codes="[{ lang: 'html', code }]"
      :class="wrap ? ['w-full', 'h-fit'] : ['w-1/2', 'h-full']"
    />
  </div>
</template>

<style lang="sass">
.glass .tp-rotv
  box-shadow: none
  border-radius: 20px
  overflow: hidden
  background: rgba(0,0,0, 0.5)
.dark .glass .tp-rotv
  background: rgba(0,0,0,0.1)
</style>
