<script setup lang="ts">
import 'dockbar'

const items = ref([1, 2, 3, 4, 5])
const deleted = ref<number | null>(null)

function onSort(event: Event) {
  const { oldIndex, newIndex } = (event as CustomEvent<{ oldIndex: number; newIndex: number }>).detail
  if (oldIndex === newIndex)
    return

  const next = [...items.value]
  const [moved] = next.splice(oldIndex, 1)
  next.splice(newIndex, 0, moved)
  items.value = next
}

function onDelete(event: Event) {
  const { index } = (event as CustomEvent<{ index: number }>).detail
  deleted.value = items.value[index] ?? null
  items.value = items.value.filter((_, itemIndex) => itemIndex !== index)
}
</script>

<template>
  <div class="sortable-page">
    <p id="sortable-order">
      {{ items.join(',') }}
    </p>
    <p id="sortable-deleted">
      {{ deleted == null ? '' : deleted }}
    </p>

    <dock-wrapper
      id="sortable-dock"
      allow-drag-delete
      sortable
      size="56"
      padding="10"
      gap="10"
      max-scale="1.8"
      max-range="180"
      @on-delete="onDelete"
      @on-sort="onSort"
    >
      <dock-item v-for="item in items" :key="item" :data-value="item">
        <button class="sortable-item" type="button">
          {{ item }}
        </button>
      </dock-item>
    </dock-wrapper>
  </div>
</template>

<style scoped>
.sortable-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  justify-content: center;
  color: white;
}

#sortable-dock {
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.32);
}

.sortable-item {
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(232, 236, 247, 0.88));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
  color: #192033;
  font: 600 18px/1 'Avenir Next', sans-serif;
}
</style>
