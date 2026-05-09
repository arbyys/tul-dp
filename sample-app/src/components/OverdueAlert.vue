<script setup lang="ts">
defineProps<{
  count: number
}>()
</script>

<template>
  <div
    v-if="count > 0"
    class="bg-destructive/10 rounded-lg p-3 border border-destructive/30 flex flex-row items-center gap-2"
  >
    <span class="text-destructive text-lg">!</span>
    <span class="text-sm text-destructive font-medium">
      {{ count === 1 ? '1 výpůjčka je po termínu' : `${count} výpůjčky jsou po termínu` }}
    </span>
  </div>
</template>
