<script setup lang="ts">
import type { ItemId } from '../../db/schema'
import type { RoomItem } from '../../types/roomDetail'

defineProps<{
  availableItemRows: ReadonlyArray<ReadonlyArray<RoomItem>>
  filteredAvailableItems: ReadonlyArray<RoomItem>
  searchTermInput: string
  expandedItemActionsId: string | null
  iconEdit: string
  iconTrash: string
  iconDots: string
}>()

const emit = defineEmits<{
  showItemActions: [itemId: string]
  goToEditItem: [itemId: ItemId]
  requestDeleteItem: [itemId: ItemId]
  goToLoanItem: [itemId: string]
}>()
</script>

<template>
  <div
    v-if="filteredAvailableItems.length === 0"
    class="flex rounded-lg p-6 items-center justify-center px-4"
  >
    <span
      :class="[
        'text-sm',
        searchTermInput.trim().length > 0
          ? 'text-muted-foreground'
          : 'text-secondary-foreground/30 opacity-80',
      ]"
    >
      {{
        searchTermInput.trim().length > 0
          ? 'Žádné předměty neodpovídají hledání.'
          : 'Místnost neobsahuje žádné předměty.'
      }}
    </span>
  </div>

  <div v-else class="flex flex-col gap-2 px-4">
    <div
      v-for="(row, rowIndex) in availableItemRows"
      :key="rowIndex"
      class="flex flex-row gap-2"
    >
      <div
        v-for="item in row"
        :key="item.id"
        class="flex-1 min-w-0 bg-card rounded-lg p-2 border border-border flex flex-col gap-2 mt-1"
      >
        <div class="flex flex-col gap-2.5 h-full">
          <div class="flex flex-row items-start gap-2">
            <div class="flex-1 min-w-0">
              <span class="text-sm font-medium text-card-foreground line-clamp-2">{{
                item.name ?? 'Neznámý předmět'
              }}</span>
              <span v-if="item.category" class="text-xs text-muted-foreground truncate">{{
                item.category
              }}</span>
            </div>
            <div class="relative w-7 h-7 shrink-0">
              <div
                v-if="expandedItemActionsId === item.id"
                class="absolute top-0 right-8 z-20 flex flex-row gap-1"
              >
                <div
                  class="flex w-7 h-7 bg-secondary rounded-md items-center justify-center border border-border cursor-pointer"
                  @click="emit('goToEditItem', item.id)"
                >
                  <img :src="iconEdit" class="w-3 h-3" alt="" />
                </div>
                <div
                  class="flex w-7 h-7 bg-destructive rounded-md items-center justify-center border border-destructive cursor-pointer"
                  @click="emit('requestDeleteItem', item.id)"
                >
                  <img :src="iconTrash" class="w-3 h-3" alt="" />
                </div>
              </div>
              <div
                class="flex absolute top-0 right-0 w-7 h-7 bg-secondary/80 rounded-md items-center justify-center border border-border cursor-pointer"
                @click="emit('showItemActions', item.id)"
              >
                <img :src="iconDots" class="w-3 h-3" alt="" />
              </div>
            </div>
          </div>
          <div
            v-if="row.some((i) => i.id === expandedItemActionsId) && item.description"
            class="rounded-md bg-secondary/40 border border-border px-2 py-1.5"
          >
            <span class="text-xs text-muted-foreground whitespace-pre-wrap break-words">
              {{ item.description }}
            </span>
          </div>
          <div class="flex-1 min-w-0" />
          <div
            class="flex bg-primary rounded-md px-2 py-2 items-center justify-center cursor-pointer mt-auto"
            @click="emit('goToLoanItem', item.id)"
          >
            <span class="text-xs font-semibold text-primary-foreground">Půjčit</span>
          </div>
        </div>
      </div>
      <div
        v-if="row.length === 1"
        class="flex-1 min-w-0 bg-card rounded-lg p-3 border border-border opacity-0 pointer-events-none"
      >
        <span class="text-xs">.</span>
      </div>
    </div>
  </div>
</template>
