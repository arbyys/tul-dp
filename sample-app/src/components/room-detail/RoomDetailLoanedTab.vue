<script setup lang="ts">
import { createIdenticon, createIdFromString } from '@evolu/common'
import type { LoanEntry, LoanGroup } from '../../types/roomDetail'
import { formatDueDate, isLoanOverdue } from '../../utils/date'

defineProps<{
  groupedLoanedByMember: ReadonlyArray<LoanGroup>
  searchTermInput: string
}>()

const emit = defineEmits<{
  handleReturn: [loanId: LoanEntry['id']]
}>()

function memberIdenticon(id: string): string {
  return createIdenticon(createIdFromString(id), 'github')
}
</script>

<template>
  <div
    v-if="groupedLoanedByMember.length === 0"
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
          ? 'Žádná výpůjčka neodpovídá hledání.'
          : 'Momentálně nejsou žádné aktivní výpůjčky.'
      }}
    </span>
  </div>

  <div v-else class="flex flex-col gap-3 px-4 mt-4">
    <div v-for="group in groupedLoanedByMember" :key="group.key">
      <div class="flex flex-row items-center gap-3">
        <div
          class="w-10 h-10 rounded-full overflow-hidden border border-border [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
          v-html="memberIdenticon(group.appOwnerId ?? group.key)"
        />
        <div class="flex-1 min-w-0">
          <span class="text-sm font-semibold text-card-foreground truncate">
            {{ group.displayName }}
          </span>
        </div>
        <div class="shrink-0 text-right">
          <span class="inline-flex flex-col text-xs text-muted-foreground">
            <span>{{ group.loans.length }} aktivních</span>
            <span>{{ group.overdueCount }} po termínu</span>
          </span>
        </div>
      </div>

      <div v-if="group.loans.length === 0" class="pl-12 py-2 mt-3">
        <span class="text-sm text-muted-foreground">Žádná aktivní výpůjčka.</span>
      </div>

      <div v-else class="flex flex-col gap-2 pl-12 mt-2">
        <div
          v-for="loan in group.loans"
          :key="loan.id"
          class="rounded-md border border-border bg-secondary/40 p-2"
        >
          <div class="flex flex-row items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
              <div class="flex justify-between w-full gap-2">
                <div class="flex flex-col min-w-0">
                  <span class="text-sm font-medium text-card-foreground truncate">{{
                    loan.itemName ?? 'Neznámý předmět'
                  }}</span>
                  <span class="text-xs text-muted-foreground truncate">
                    {{ loan.itemCategory ?? '–' }}
                  </span>
                </div>

                <div
                  v-if="group.isCurrentUser"
                  class="grow-0 bg-primary rounded-md px-4 cursor-pointer flex items-center"
                  @click="emit('handleReturn', loan.id)"
                >
                  <span class="text-xs font-medium text-primary-foreground">Vrátit</span>
                </div>
              </div>

              <div class="flex justify-between w-full mt-3 gap-3">
                <div class="flex flex-col gap-0.5 min-w-0">
                  <span class="text-xs text-muted-foreground">
                    <span class="font-bold">Od:</span>
                    {{ formatDueDate(loan.borrowedAt) }}
                  </span>
                  <span
                    :class="[
                      'text-xs',
                      isLoanOverdue(loan.expectedReturnAt) ? 'text-destructive' : 'text-muted-foreground',
                    ]"
                  >
                    <span class="font-bold">Do:</span>
                    {{ formatDueDate(loan.expectedReturnAt) }}
                  </span>
                </div>
                <span v-if="loan.notes" class="text-xs text-muted-foreground text-right truncate">
                  <span class="font-bold">Poznámka:</span>
                  {{ loan.notes }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
