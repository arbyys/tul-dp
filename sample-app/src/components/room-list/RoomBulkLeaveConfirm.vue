<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean
  selectedCount: number
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function getRoomSuffix(count: number): string {
  if (count > 4) return 'í'
  if (count > 1) return 'i'
  return ''
}
</script>

<template>
  <div v-if="props.isOpen" class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-black/70" @click="emit('cancel')" />
    <div
      class="absolute inset-0 flex items-center justify-center px-4"
      @click.self="emit('cancel')"
    >
      <div class="w-full max-w-lg bg-card rounded-lg p-4 border border-border flex flex-col gap-2">
        <span class="text-base font-medium text-card-foreground">
          Opustit {{ props.selectedCount }} místnost{{ getRoomSuffix(props.selectedCount) }}?
        </span>
        <span class="text-sm text-muted-foreground">
          Místnosti se odeberou z vašeho seznamu. Akci nelze vrátit zpět.
        </span>
        <div class="flex flex-row gap-3 mt-4">
          <div
            class="flex flex-1 bg-destructive rounded-lg py-2 items-center justify-center cursor-pointer"
            @click="emit('confirm')"
          >
            <span class="text-sm font-medium text-destructive-foreground">Opustit</span>
          </div>
          <div
            class="flex flex-1 bg-secondary rounded-lg py-2 items-center justify-center border border-border cursor-pointer"
            @click="emit('cancel')"
          >
            <span class="text-sm font-medium text-secondary-foreground">Zrušit</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
