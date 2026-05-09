<script setup lang="ts">
import { tryOnScopeDispose, useOnline } from '@vueuse/core'
import { computed, ref } from 'vue'
import { getEvoluDeps } from '../db/evolu'

const hasError = ref(false)
const isOnline = useOnline()

const deps = getEvoluDeps()

const unsubscribe = deps.evoluError.subscribe(() => {
  hasError.value = deps.evoluError.get() != null
})

tryOnScopeDispose(unsubscribe)

const color = computed(() => {
  if (!isOnline.value) return 'bg-muted-foreground'
  if (hasError.value) return 'bg-destructive'
  return 'bg-success'
})

const label = computed(() => {
  if (!isOnline.value) return 'Offline'
  if (hasError.value) return 'Chyba'
  return 'Online'
})
</script>

<template>
  <span class="text-xs text-muted-foreground flex items-center gap-2">
    <span :class="['w-2 h-2 rounded-full', color]" />
    <span>{{ label }}</span>
  </span>
</template>
