<script lang="ts" setup>
import 'dockbar'

const svgPromises = import.meta.glob('~/assets/rauno/*.svg', { as: 'raw' })
const svgLib: Record<string, string> = reactive({})
Object.entries(svgPromises).forEach(([path, promise]) => {
  promise().then((svg) => {
    const filename = path.split('/').pop()?.split('.')?.[0]
    if (!filename)
      return
    svgLib[filename] = svg
  })
})
const buttons = computed(() => [
  {
    svgKey: 'home',
    title: 'Home',
    href: 'https://rauno.me/',
  },
  {
    svgKey: 'craft',
    title: 'Craft',
    href: 'https://rauno.me/craft',
  },
  {
    svgKey: 'projects',
    title: 'Projects',
    href: 'https://rauno.me/projects',
  },
  {
    svgKey: 'photos',
    title: 'Photos',
    href: 'https://rauno.me/photos',
  },
  {
    svgKey: 'twitter',
    title: 'Twitter',
    href: 'https://twitter.com/raunofreiberg',
  },
  {
    svgKey: 'github',
    title: 'GitHub',
    href: 'https://github.com/raunofreiberg',
  },
  {
    svgKey: 'mail',
    title: 'Mail',
    href: 'mailto:yo@rauno.me',
  },
  {
    svgKey: 'dark-mode',
    title: isDark.value ? 'Light' : 'Dark',
    action: () => isDark.value = !isDark.value,
    icon: isDark.value ? 'i-carbon:sun' : 'i-carbon:moon',
  },

])
</script>

<template>
  <div class="dock">
    <dock-wrapper v-bind="config">
      <dock-item v-for="btn in buttons" :key="btn.svgKey">
        <a full flex-center :href="btn.href" target="_blank">
          <button
            full
            class="dock-item" flex="~ center" @click="btn.action && btn.action()"
          >
            <div v-if="btn.icon" :class="btn.icon" />
            <div v-else full flex-center v-html="svgLib[btn.svgKey]" />
          </button>
        </a>
      </dock-item>
    </dock-wrapper>
  </div>
</template>

<style scoped>
.dock {
    --colors-gray2: hsl(0, 0%, 96%);
    --colors-gray4: hsl(0 0% 93.0%);
    --colors-gray5: hsl(0, 0%, 84%);
    --colors-gray6: hsl(0 0% 88.7%);
    --colors-gray7: hsl(0 0% 85.8%);
    --colors-gray10: hsl(0 0% 52.3%);
    --shadows-large: 0 30px 60px rgba(0, 0, 0, 0.12);
}
.dark .dock {
  --colors-gray2: hsl(0 0% 11.0%);
  --colors-gray4: hsl(0 0% 15.8%);
  --colors-gray5: hsl(0 0% 17.9%);
  --colors-gray6: hsl(0 0% 20.5%);
  --colors-gray7: hsl(0 0% 24.3%);
  --colors-gray10: hsl(0 0% 49.4%);
}

.dock {
  border-radius: 9999px;
  backdrop-filter: blur(100px) saturate(400%) brightness(80%);
  box-shadow: var(--shadows-large);
  border: 1px solid var(--colors-grayA4);
  background-color: rgba(255, 255, 255, 0.6);
}

.dock::before {
  content: "";
  background: linear-gradient(90deg, rgba(0, 0, 0, 0), rgba(255,255,255,0.3) 20%, rgba(255,255,255, 1) 67.19%, rgba(0, 0, 0, 0));
  opacity: 0.2;
  height: 1px;
  position: absolute;
  top: -1px;
  width: 95%;
  z-index: -1;
}

.dock-item {
  --gradient-color-1: var(--colors-gray2);
  --gradient-color-2: var(--colors-gray5);
  border-radius: 9999px;
  background-image: linear-gradient( 45deg, var(--gradient-color-1), var(--gradient-color-2), var(--gradient-color-1), var(--gradient-color-2) );
  background-size: 200% 100%;
  color: var(--colors-gray10);
}
.dark .dock-item::before {
  content: "";
  background: linear-gradient(90deg, rgba(0, 0, 0, 0), var(--colors-gray4) 20%, var(--colors-gray7) 67.19%, rgba(0, 0, 0, 0));
  opacity: 0.8;
  position: absolute;
  top: -1px;
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  z-index: -1;
}

:deep(.dock-item svg) {
  width: 50%;
  height: 50%;
}

/* dark */
.dark .dock {
  backdrop-filter: blur(100px) saturate(400%) brightness(80%);
  background-color: rgba(22, 22, 22, 0.8);
}
/* .dark .dock-item {

} */
</style>
