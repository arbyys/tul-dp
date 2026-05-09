<script setup lang="ts">
import { createIdenticon, createIdFromString } from '@evolu/common'
import type { MemberLoanSummary } from '../../types/roomDetail'

defineProps<{
  isOpen: boolean
  memberLoanSummaries: ReadonlyArray<MemberLoanSummary>
}>()

const emit = defineEmits<{
  close: []
}>()

function memberIdenticon(id: string): string {
  return createIdenticon(createIdFromString(id), 'github')
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-40">
    <div class="absolute inset-0 bg-black/60" @click="emit('close')" />

    <div class="absolute inset-0 flex items-center justify-center px-4" @click.self="emit('close')">
      <div class="w-full max-w-xl bg-card rounded-lg p-4 border border-border flex flex-col gap-3">
        <div class="flex flex-row items-center justify-between gap-2">
          <span class="text-base font-semibold text-card-foreground">Členové místnosti</span>
          <div
            class="flex w-8 h-8 rounded-md bg-secondary border border-border items-center justify-center cursor-pointer"
            @click="emit('close')"
          >
            <span class="text-sm font-semibold text-secondary-foreground">✕</span>
          </div>
        </div>

        <div
          v-if="memberLoanSummaries.length === 0"
          class="flex rounded-lg border border-border bg-secondary/30 p-4 items-center justify-center"
        >
          <span class="text-sm text-muted-foreground">Seznam členů je zatím prázdný.</span>
        </div>

        <div v-else class="flex flex-col gap-2">
          <div
            v-for="member in memberLoanSummaries"
            :key="member.memberId"
            class="rounded-lg border border-border bg-secondary/40 p-3 flex flex-row gap-3"
          >
            <div
              class="w-10 h-10 rounded-full overflow-hidden border border-border [&>svg]:w-full [&>svg]:h-full [&>svg]:block flex-shrink-0"
              v-html="memberIdenticon(member.appOwnerId ?? member.memberId)"
            />

            <div class="flex justify-between w-full min-h-[72px]">
              <div class="flex flex-col justify-between min-h-[72px]">
                <div class="flex flex-col">
                  <span class="text-sm font-semibold text-card-foreground truncate">
                    {{ member.displayName }}
                  </span>
                  <span class="text-xs text-card-foreground opacity-40 truncate mt-1">
                    {{ member.displayMail }}
                  </span>
                </div>
                <span class="text-[11px] text-muted-foreground/60">
                  Výpůjčky uživatele: {{ member.totalLoanCount }}
                </span>
              </div>
              <div class="flex flex-col justify-end items-end pb-0.5">
                <div class="flex flex-row flex-wrap gap-1 mt-2 justify-end">
                  <div class="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5">
                    <span class="text-[11px] text-primary"
                      >Aktivní: {{ member.activeLoanCount }}</span
                    >
                  </div>
                  <div
                    class="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5"
                  >
                    <span class="text-[11px] text-destructive"
                      >Po termínu: {{ member.overdueLoanCount }}</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
