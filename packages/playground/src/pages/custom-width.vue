<script setup lang="ts">
import 'dockbar'

interface WidthItem {
  id: string
  label: string
  width?: number
}

const staticItems: WidthItem[] = [
  { id: 'one', label: '56' },
  { id: 'search', label: '96', width: 96 },
  { id: 'command', label: '144', width: 144 },
  { id: 'compact', label: '72', width: 72 },
]

const reactiveWide = ref(false)
const reactiveWidth = computed(() => reactiveWide.value ? 156 : 84)

const sortableItems = ref<WidthItem[]>([
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B', width: 112 },
  { id: 'c', label: 'C', width: 48 },
  { id: 'd', label: 'D', width: 136 },
  { id: 'e', label: 'E' },
])

function itemAttrs(item: WidthItem) {
  return item.width ? { width: item.width } : {}
}

function onSort(event: Event) {
  const { oldIndex, newIndex } = (event as CustomEvent<{ oldIndex: number; newIndex: number }>).detail
  if (oldIndex === newIndex)
    return

  const next = [...sortableItems.value]
  const [moved] = next.splice(oldIndex, 1)
  next.splice(newIndex, 0, moved)
  sortableItems.value = next
}
</script>

<template>
  <main class="custom-width-page">
    <section class="case">
      <h1>Custom item width</h1>
      <p id="custom-width-static-widths">
        {{ staticItems.map(item => item.width ?? 56).join(',') }}
      </p>

      <dock-wrapper
        id="custom-width-static"
        size="56"
        padding="10"
        gap="10"
        max-scale="1.7"
        max-range="180"
      >
        <dock-item
          v-for="item in staticItems"
          :key="item.id"
          :data-value="item.id"
          v-bind="itemAttrs(item)"
        >
          <button class="width-item" type="button">
            {{ item.label }}
          </button>
        </dock-item>
      </dock-wrapper>
    </section>

    <section class="case">
      <h2>Reactive width</h2>
      <label class="toggle">
        <input id="custom-width-toggle" v-model="reactiveWide" type="checkbox">
        <span>{{ reactiveWidth }}</span>
      </label>

      <dock-wrapper
        id="custom-width-reactive"
        size="56"
        padding="10"
        gap="10"
        max-scale="1.7"
        max-range="180"
      >
        <dock-item>
          <button class="width-item" type="button">
            56
          </button>
        </dock-item>
        <dock-item :width="reactiveWidth">
          <button class="width-item accent" type="button">
            {{ reactiveWidth }}
          </button>
        </dock-item>
        <dock-item :width="104">
          <button class="width-item" type="button">
            104
          </button>
        </dock-item>
      </dock-wrapper>
    </section>

    <section class="case">
      <h2>Sortable mixed widths</h2>
      <p id="custom-width-sortable-order">
        {{ sortableItems.map(item => item.id).join(',') }}
      </p>

      <dock-wrapper
        id="custom-width-sortable"
        sortable
        size="56"
        padding="10"
        gap="10"
        max-scale="1.7"
        max-range="180"
        @on-sort="onSort"
      >
        <dock-item
          v-for="item in sortableItems"
          :key="item.id"
          :data-value="item.id"
          v-bind="itemAttrs(item)"
        >
          <button class="width-item sortable" type="button">
            {{ item.label }}
          </button>
        </dock-item>
      </dock-wrapper>
    </section>
  </main>
</template>

<style scoped>
.custom-width-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 34px;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: #f8fbff;
  background: linear-gradient(135deg, #111827, #242038 52%, #171717);
}

.case {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 28px;
}

h2 {
  font-size: 18px;
  font-weight: 700;
}

p {
  min-height: 20px;
  color: rgba(248, 251, 255, 0.66);
  font: 600 13px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
}

dock-wrapper {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.24);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(24px) saturate(170%);
}

.width-item {
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(223, 230, 246, 0.9));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.68);
  color: #111827;
  font: 750 16px/1 'Avenir Next', Inter, sans-serif;
}

.width-item.accent {
  background: linear-gradient(180deg, #bff7d0, #74d7a1);
}

.width-item.sortable {
  cursor: grab;
}

.toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 92px;
  height: 32px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #f8fbff;
  font: 700 14px/1 Inter, sans-serif;
}

.toggle input {
  width: 14px;
  height: 14px;
  accent-color: #74d7a1;
}
</style>
