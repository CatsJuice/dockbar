<script setup lang="ts">
import 'dockbar/dist'
import { isDark } from '../../composables/dark'

const buttons = computed(() => [
  {
    icon: 'i-fa6-brands:github',
    href: 'https://github.com/CatsJuice/dockbar',
  },
  {
    icon: 'i-fa6-solid:compass',
    href: 'https://oooo.so',
  },
  {
    icon: 'i-fa6-brands:twitter',
    href: 'https://twitter.com/cats_juice',
  },
  {
    icon: 'i-mingcute:mouse-fill',
    href: 'https://cursor.oooo.so',
  },
  {
    icon: 'i-fa6-solid:code',
    href: 'https://github.com/CatsJuice',
  },
  {
    icon: 'i-fa6-brands:codepen',
    href: 'https://codepen.io/catsjuice',
  },
  {
    icon: 'i-fa6-solid:envelope',
    href: 'mailto:cats_juice@outlook.com',
  },
  {},
  {
    icon: isDark.value ? 'i-carbon:sun' : 'i-carbon:moon',
    action: () => isDark.value = !isDark.value,
  },
])
</script>

<template>
  <div class="dock">
    <LightBorderFrame :radius="20" :border-width="1.2">
      <dock-wrapper
        :size="config.size"
        :padding="config.padding"
        :gap="config.gap"
        :max-scale="config.maxScale"
        :max-range="config.maxRange"
        :disabled="config.disabled"
        :direction="config.direction"
        :position="config.position"
      >
        <component
          :is="btn.icon ? 'dock-item' : 'div'"
          v-for="(btn, i) in buttons"
          :key="i"
          :style="!btn.icon ? 'align-self: center' : ''"
        >
          <div v-if="btn.icon">
            <component
              :is="btn.href ? 'a' : 'div'"
              target="_blank"
              data-cursor="block" flex-center full class="dock-btn"
              :href="btn.href"
              @click="btn?.action?.()"
            >
              <div h="1/2" :class="btn.icon" />
            </component>
          </div>

          <div v-else :style="{ '--size': `${config.size / 2}px` }" pointer-events-none bg="white/40" class="separator" />
        </component>
      </dock-wrapper>
    </LightBorderFrame>
  </div>
</template>

<style scoped>
.dock {
  border-radius: 22px;
}
.dock::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  top: 0;
  border-radius: inherit;
  backdrop-filter: blur(10px) saturate(180%);
  background-color: rgba(255,255,255,0.3);
  z-index: -1;
}
.dock-btn {
  color: #444;
  cursor: pointer;
  border-radius: 12px;
  background: rgba(255,255,255,0.5);
  backdrop-filter: blur(12px) saturate(180%);
  position: relative;
  font-size: 100%;
  border: 1px solid rgba(180, 180, 180, 0.1);
  background-image: linear-gradient( 45deg,
    rgba(255, 255, 255, 0.3),
    rgba(255, 255, 255, 0.2),
    rgba(255, 255, 255, 0.2),
    rgba(255, 255, 255, 0.3)
    );
  background-size: 200% 100%;
}

.dark .dock {
  border: 1px solid rgba(100, 100, 100, 0.2);
}
.dark .dock::after {
  background-color: rgba(0,0,0,0.2);
  backdrop-filter: blur(10px) saturate(120%);
}
.dark .dock-btn {
  color: white;
  background: rgba(0,0,0,0.3);
  backdrop-filter: blur(12px) saturate(110%);
}

.dock.horizontal .separator {
  width: 1px;
  height: var(--size);
}
.dock.vertical .separator {
  width: var(--size);
  height: 1px;
}
</style>
