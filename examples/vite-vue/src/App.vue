<script setup lang="ts">
import 'dockbar'
</script>

<template>
  <dock-wrapper id="dock">
    <dock-item v-for="i in 10" :key="i">
      <div class="item">
        {{ i }}
      </div>
    </dock-item>
  </dock-wrapper>
</template>

<style scoped>
#dock {
  position: fixed;
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
  background: linear-gradient(90deg, #FFFFFF 0%, #FEFEFE 100%);
  border-radius: 999px;
  border: 1px solid #E5E5E5;
}
.item {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border-radius: 50%;
}
</style>
