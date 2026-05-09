<script setup lang="ts">
import { computed } from 'vue'
import { createIdenticon, createIdFromString } from '@evolu/common'
import { useCurrentUser } from '../composables/useCurrentUser'
import NetworkStatus from './NetworkStatus.vue'

const { profile, ownerId } = useCurrentUser()

const identiconSvg = computed(() => {
  const idSource = ownerId.value ?? profile.value?.displayName ?? 'unknown'
  try {
    return createIdenticon(createIdFromString(String(idSource)), 'github')
  } catch {
    return ''
  }
})
</script>

<template>
  <div class="flex flex-row items-center gap-2 ml-2">
    <div
      class="w-7 h-7 rounded-full overflow-hidden border border-border flex-shrink-0"
      v-html="identiconSvg"
    />

    <div class="flex flex-col gap-0">
      <span class="text-xs font-semibold text-card-foreground">{{
        profile?.displayName ?? 'Neznámý'
      }}</span>
      <NetworkStatus />
    </div>
  </div>
</template>
