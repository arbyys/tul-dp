<script setup lang="ts">
const props = defineProps<{
  isVisible: boolean
  selectedCount: number
}>()

const emit = defineEmits<{
  openShare: []
  requestLeave: []
  cancel: []
}>()
</script>

<template>
  <div v-if="props.isVisible" class="fixed bottom-0 left-0 right-0 z-40 flex justify-center">
    <div class="w-full max-w-lg bg-card border-t border-border p-4">
      <div class="flex flex-row gap-3">
        <div
          class="flex shrink-0 w-12 bg-secondary rounded-lg items-center justify-center cursor-pointer border border-border"
          @click="emit('cancel')"
          aria-label="Zrušit výběr"
        >
          <span class="text-sm font-semibold text-secondary-foreground">✕</span>
        </div>
        <div
          class="flex flex-1 bg-secondary rounded-lg py-3 items-center justify-center cursor-pointer border border-border gap-2"
          @click="emit('openShare')"
        >
          <span class="text-sm font-medium text-secondary-foreground">Sdílet</span>
          <span
            class="text-xs bg-muted-foreground/25 text-secondary-foreground rounded-full w-5 h-5 flex items-center justify-center font-semibold"
            >{{ props.selectedCount }}</span
          >
        </div>
        <div
          class="flex flex-1 bg-destructive rounded-lg py-3 items-center justify-center cursor-pointer gap-2"
          @click="emit('requestLeave')"
        >
          <span class="text-sm font-medium text-destructive-foreground">Opustit</span>
          <span
            class="text-xs bg-white/20 text-white rounded-full w-5 h-5 flex items-center justify-center font-semibold"
            >{{ props.selectedCount }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>
