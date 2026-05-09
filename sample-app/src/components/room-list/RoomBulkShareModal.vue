<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { computed, onUnmounted, ref } from 'vue'
import { useIconTheme, useThemedIconVariant } from '../../composables/useIconTheme'
import iconCopyBlack from '../../assets/icon-copy-black.svg'
import iconCopyWhite from '../../assets/icon-copy-white.svg'
import iconShowBlack from '../../assets/icon-show-black.svg'
import iconShowWhite from '../../assets/icon-show-white.svg'
import iconHideBlack from '../../assets/icon-hide-black.svg'
import iconHideWhite from '../../assets/icon-hide-white.svg'
import iconTickBlack from '../../assets/icon-tick-black.svg'
import iconTickWhite from '../../assets/icon-tick-white.svg'

const props = defineProps<{
  isOpen: boolean
  selectedCount: number
  bulkShareTab: 'qr' | 'manual' | 'audio'
  bulkShareQrUrl: string | null
  bulkShareManualText: string | null
  isTransmitting: boolean
  audioIsDone: boolean
  audioError: string | null
}>()

const emit = defineEmits<{
  close: []
  setTab: [tab: 'qr' | 'manual' | 'audio']
  startAudio: []
  stopAudio: []
}>()

const { useBlackIcons } = useIconTheme()
const iconCopy = useThemedIconVariant(useBlackIcons, iconCopyBlack, iconCopyWhite)
const iconTick = useThemedIconVariant(useBlackIcons, iconTickBlack, iconTickWhite)
const iconShow = useThemedIconVariant(useBlackIcons, iconShowBlack, iconShowWhite)
const iconHide = useThemedIconVariant(useBlackIcons, iconHideBlack, iconHideWhite)

const isHidden = ref(true)
const copyDone = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

const { copy, isSupported: clipboardOk } = useClipboard()

const displayedText = computed(() => {
  if (!props.bulkShareManualText) return null
  return isHidden.value
    ? props.bulkShareManualText.replace(/[^\s;]/g, '•')
    : props.bulkShareManualText
})

async function copyText() {
  if (!props.bulkShareManualText || !clipboardOk.value) return
  await copy(props.bulkShareManualText)
  copyDone.value = true
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copyDone.value = false
  }, 1500)
}

onUnmounted(() => {
  if (copyTimer) clearTimeout(copyTimer)
})
</script>

<template>
  <div v-if="props.isOpen" class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-black/70" @click="emit('close')" />
    <div
      class="absolute inset-0 flex items-end justify-center px-4 pb-6"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-lg bg-card rounded-xl border border-border flex flex-col gap-4 p-4">
        <div class="flex flex-row items-center justify-between">
          <span class="text-base font-semibold text-card-foreground">
            Sdílet místnosti ({{ props.selectedCount }})
          </span>
          <div
            class="flex w-8 h-8 rounded-md bg-secondary border border-border items-center justify-center cursor-pointer"
            @click="emit('close')"
          >
            <span class="text-sm font-semibold text-secondary-foreground">✕</span>
          </div>
        </div>

        <div class="flex flex-row gap-1 bg-secondary rounded-lg p-1">
          <button
            v-for="(label, key) in { qr: 'QR kód', manual: 'Ručně', audio: 'Zvuk' }"
            :key="key"
            :class="[
              'flex flex-1 rounded-md py-2 items-center justify-center cursor-pointer text-sm font-medium',
              props.bulkShareTab === key ? 'bg-card text-card-foreground' : 'text-muted-foreground',
            ]"
            @click="emit('setTab', key as 'qr' | 'manual' | 'audio')"
          >
            {{ label }}
          </button>
        </div>

        <div v-if="props.bulkShareTab === 'qr'" class="flex flex-col items-center gap-3">
          <div
            v-if="props.bulkShareQrUrl"
            class="flex flex-row w-3/5 items-center gap-2 justify-between"
          >
            <span class="text-xs text-muted-foreground">Naskenujte QR kód na druhém zařízení.</span>
            <button
              class="flex-shrink-0 flex w-8 h-8 rounded-md bg-secondary border border-border items-center justify-center cursor-pointer"
              :title="isHidden ? 'Zobrazit' : 'Skrýt'"
              @click="isHidden = !isHidden"
            >
              <img :src="isHidden ? iconShow : iconHide" class="w-4 h-4" alt="" />
            </button>
          </div>
          <div
            v-if="props.bulkShareQrUrl"
            class="rounded-lg overflow-hidden border border-border bg-white p-2"
          >
            <img
              :src="props.bulkShareQrUrl"
              alt="QR kód"
              class="w-48 h-48 transition-all duration-300"
              :class="isHidden ? 'blur-md' : ''"
            />
          </div>
          <span v-else class="text-sm text-muted-foreground">Generuji QR kód…</span>
        </div>

        <div v-if="props.bulkShareTab === 'manual'" class="flex flex-col gap-2">
          <template v-if="displayedText">
            <div class="flex flex-row items-center justify-between gap-2">
              <span class="text-xs text-muted-foreground">Mnemoniky (oddělené středníkem)</span>
              <div class="flex flex-row gap-1">
                <button
                  class="flex w-8 h-8 rounded-md bg-secondary border border-border items-center justify-center cursor-pointer"
                  title="Kopírovat"
                  @click="copyText"
                >
                  <img :src="copyDone ? iconTick : iconCopy" class="w-4 h-4" alt="" />
                </button>
                <button
                  class="flex w-8 h-8 rounded-md bg-secondary border border-border items-center justify-center cursor-pointer"
                  :title="isHidden ? 'Zobrazit' : 'Skrýt'"
                  @click="isHidden = !isHidden"
                >
                  <img :src="isHidden ? iconShow : iconHide" class="w-4 h-4" alt="" />
                </button>
              </div>
            </div>
            <textarea
              class="w-full rounded-lg border border-border/60 bg-secondary/60 px-3 py-3 text-xs font-mono text-secondary-foreground resize-none"
              :value="displayedText"
              readonly
              rows="4"
            />
          </template>
          <span v-else class="text-sm text-secondary-foreground/30 opacity-80 text-center">
            Žádné místnosti k sdílení.
          </span>
        </div>

        <div v-if="props.bulkShareTab === 'audio'" class="flex flex-col items-center gap-3 mb-3">
          <span class="text-xs text-muted-foreground text-center mt-2">
            Na přijímači spusťte poslouchání, přibližte toto zařízení a klikněte na přehrát.
          </span>
          <div
            v-if="!props.isTransmitting && !props.audioIsDone"
            class="flex bg-primary rounded-lg px-6 py-3 items-center justify-center cursor-pointer"
            @click="emit('startAudio')"
          >
            <span class="text-sm font-medium text-primary-foreground">Přehrát zvukový přenos</span>
          </div>
          <div v-else-if="props.isTransmitting" class="flex flex-col items-center gap-2 mt-2">
            <div class="flex gap-1">
              <span
                v-for="i in 5"
                :key="i"
                class="block w-1.5 bg-primary rounded-full animate-bounce"
                :style="`height: ${12 + i * 4}px; animation-delay: ${i * 80}ms`"
              />
            </div>
            <span class="text-sm text-card-foreground">Přehrávání...</span>
            <button
              class="text-xs text-muted-foreground underline cursor-pointer"
              @click="emit('stopAudio')"
            >
              Zastavit
            </button>
          </div>
          <div v-else class="flex flex-col items-center gap-1">
            <span class="text-sm text-success">✓ Přenos dokončen</span>
            <button
              class="text-xs text-muted-foreground underline cursor-pointer"
              @click="emit('startAudio')"
            >
              Přehrát znovu
            </button>
          </div>
          <span v-if="props.audioError" class="text-xs text-destructive text-center">{{
            props.audioError
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
