<script setup lang="ts">
interface ConfirmDialogState {
  type: 'return-loan' | 'delete-item' | 'delete-room'
  title: string
  confirmLabel: string
}

const props = defineProps<{
  confirmDialog: ConfirmDialogState | null
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div v-if="props.confirmDialog" class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-black/70" @click="emit('cancel')" />

    <div
      class="absolute inset-0 flex items-center justify-center px-4"
      @click.self="emit('cancel')"
    >
      <div class="w-full max-w-lg bg-card rounded-lg p-4 border border-border flex flex-col gap-2">
        <span class="text-base font-medium text-card-foreground">{{
          props.confirmDialog.title
        }}</span>
        <span class="text-sm text-muted-foreground">
          {{
            props.confirmDialog.type === 'delete-room'
              ? 'Místnost se odebere z vašeho seznamu připojených místností.'
              : props.confirmDialog.type === 'delete-item'
                ? 'Tato akce je destruktivní a nelze ji vrátit zpět.'
                : 'Akci můžete kdykoliv změnit novou výpůjčkou.'
          }}
        </span>

        <div class="flex flex-row gap-3 mt-4">
          <div
            :class="[
              'flex flex-1 rounded-lg py-2 items-center justify-center cursor-pointer',
              props.confirmDialog.type === 'return-loan' ? 'bg-primary' : 'bg-destructive',
            ]"
            @click="emit('confirm')"
          >
            <span
              :class="[
                'text-sm font-medium',
                props.confirmDialog.type === 'return-loan'
                  ? 'text-primary-foreground'
                  : 'text-destructive-foreground',
              ]"
            >
              {{ props.confirmDialog.confirmLabel }}
            </span>
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
