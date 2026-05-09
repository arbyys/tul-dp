<script setup lang="ts">
import type { HistoryEvent } from '../../types/roomDetail'
import { formatDateReadable } from '../../utils/date'
import {
  historyEventBadgeClass,
  historyEventLabel,
  historyEventToneClass,
} from '../../utils/historyEvent'

defineProps<{
  historyEvents: ReadonlyArray<HistoryEvent>
}>()
</script>

<template>
  <div class="px-4 flex flex-col gap-3">
    <div
      v-if="historyEvents.length === 0"
      class="flex rounded-lg p-6 items-center justify-center"
    >
      <span class="text-sm text-secondary-foreground/30 opacity-80"
        >Historie výpůjček je prázdná.</span
      >
    </div>

    <div
      v-for="event in historyEvents"
      :key="event.id"
      :class="[
        'rounded-lg p-3 border flex flex-col gap-1',
        historyEventToneClass(event.eventType),
      ]"
    >
      <div class="flex flex-row items-center justify-between gap-2">
        <div class="flex-1 flex flex-col min-w-0">
          <span class="text-sm font-medium text-card-foreground">{{ event.itemName }}</span>
          <span v-if="event.itemCategory" class="text-xs text-muted-foreground">{{
            event.itemCategory
          }}</span>
        </div>
        <span
          :class="[
            'text-xs font-semibold px-2 py-1 rounded-md border',
            historyEventBadgeClass(event.eventType),
          ]"
        >
          {{ historyEventLabel(event.eventType) }}
        </span>
      </div>
      <span class="text-xs text-card-foreground mt-4">
        {{ event.message }},
        <span class="text-muted-foreground">{{ formatDateReadable(event.at) }}</span>
      </span>
    </div>
  </div>
</template>
