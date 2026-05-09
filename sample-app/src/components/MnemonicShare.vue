<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import QRCode from 'qrcode'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useQuietTransmit } from '../composables/useQuiet'
import { useIconTheme, useThemedIconVariant } from '../composables/useIconTheme'
import iconCopyBlack from '../assets/icon-copy-black.svg'
import iconCopyWhite from '../assets/icon-copy-white.svg'
import iconShowBlack from '../assets/icon-show-black.svg'
import iconShowWhite from '../assets/icon-show-white.svg'
import iconHideBlack from '../assets/icon-hide-black.svg'
import iconHideWhite from '../assets/icon-hide-white.svg'
import iconTickBlack from '../assets/icon-tick-black.svg'
import iconTickWhite from '../assets/icon-tick-white.svg'

type ShareTab = 'qr' | 'manual' | 'audio'

const props = defineProps<{ mnemonic: string | null }>()

const activeTab = ref<ShareTab>('qr')
const isHidden = ref(true)
const qrDataUrl = ref<string | null>(null)

watch(
  () => props.mnemonic,
  async (mnemonic) => {
    if (!mnemonic) {
      qrDataUrl.value = null
      return
    }
    qrDataUrl.value = await QRCode.toDataURL(mnemonic, { width: 256, margin: 2 })
  },
  { immediate: true },
)

const { useBlackIcons } = useIconTheme()
const iconCopy = useThemedIconVariant(useBlackIcons, iconCopyBlack, iconCopyWhite)
const iconTick = useThemedIconVariant(useBlackIcons, iconTickBlack, iconTickWhite)
const iconShow = useThemedIconVariant(useBlackIcons, iconShowBlack, iconShowWhite)
const iconHide = useThemedIconVariant(useBlackIcons, iconHideBlack, iconHideWhite)

const { copy, isSupported: clipboardOk } = useClipboard()
const copyDone = ref(false)
let copyResetTimer: ReturnType<typeof setTimeout> | null = null
const { isTransmitting, isDone, error: audioError, transmit, stop } = useQuietTransmit()

const displayedText = computed(() => {
  if (!props.mnemonic) return null
  return isHidden.value ? props.mnemonic.replace(/[^\s]/g, '•') : props.mnemonic
})

async function copyMnemonic() {
  if (!props.mnemonic || !clipboardOk.value) return
  await copy(props.mnemonic)
  copyDone.value = true
  if (copyResetTimer) clearTimeout(copyResetTimer)
  copyResetTimer = setTimeout(() => {
    copyDone.value = false
  }, 1500)
}

async function startAudio() {
  if (!props.mnemonic) return
  await transmit(props.mnemonic)
}

onUnmounted(() => {
  stop()
  if (copyResetTimer) clearTimeout(copyResetTimer)
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-row gap-1 bg-secondary rounded-lg p-1 mb-2">
      <button
        v-for="(label, key) in { qr: 'QR kód', manual: 'Ručně', audio: 'Zvuk' }"
        :key="key"
        :class="[
          'flex flex-1 rounded-md py-2 items-center justify-center cursor-pointer text-sm font-medium',
          activeTab === key ? 'bg-card text-card-foreground' : 'text-muted-foreground',
        ]"
        @click="activeTab = key as ShareTab"
      >
        {{ label }}
      </button>
    </div>

    <div v-if="activeTab === 'qr'" class="flex flex-col items-center gap-3">
      <div
        class="flex flex-row w-3/5 items-center gap-2 justify-between"
        v-if="mnemonic && qrDataUrl"
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
        v-if="mnemonic && qrDataUrl"
        class="rounded-lg overflow-hidden border border-border bg-white p-3"
      >
        <img
          :src="qrDataUrl"
          alt="QR kód mnemoniku"
          class="w-50 h-50 transition-all duration-300"
          :class="isHidden ? 'blur-md' : ''"
        />
      </div>
      <span v-else class="text-sm text-secondary-foreground/30 opacity-80"
        >Mnemonic není k dispozici.</span
      >
    </div>

    <div v-if="activeTab === 'manual'" class="flex flex-col gap-2">
      <template v-if="displayedText">
        <div class="flex flex-row items-center justify-between gap-2">
          <span class="text-xs text-muted-foreground">
            Zadejte tento mnemonic na druhém zařízení
          </span>
          <div class="flex flex-row gap-1">
            <button
              class="flex w-8 h-8 rounded-md bg-secondary border border-border items-center justify-center cursor-pointer"
              title="Kopírovat"
              @click="copyMnemonic"
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
          rows="3"
        />
      </template>
      <span v-else class="text-sm text-secondary-foreground/30 opacity-80 text-center"
        >Mnemonic není k dispozici.</span
      >
    </div>

    <div v-if="activeTab === 'audio'" class="flex flex-col items-center gap-3">
      <span class="text-xs text-muted-foreground text-center mt-2"
        >Na přijímači spusťte poslouchání, přibližte toto zařízení a klikněte na přehrát.</span
      >
      <div
        v-if="!isTransmitting && !isDone"
        class="flex bg-primary rounded-lg px-6 py-3 items-center justify-center cursor-pointer mt-2"
        :class="!mnemonic ? 'opacity-40 pointer-events-none' : ''"
        @click="startAudio"
      >
        <span class="text-sm font-medium text-primary-foreground">Přehrát zvukový přenos</span>
      </div>
      <div v-else-if="isTransmitting" class="flex flex-col items-center gap-2 mt-2">
        <div class="flex gap-1">
          <span
            v-for="i in 5"
            :key="i"
            class="block w-1.5 bg-primary rounded-full animate-bounce"
            :style="`height: ${12 + i * 4}px; animation-delay: ${i * 80}ms`"
          />
        </div>
        <span class="text-sm text-card-foreground">Přehrávání...</span>
        <button class="text-xs text-muted-foreground underline cursor-pointer" @click="stop">
          Zastavit
        </button>
      </div>
      <div v-else class="flex flex-col items-center gap-1">
        <span class="text-sm text-success">✓ Přenos dokončen</span>
        <button class="text-xs text-muted-foreground underline cursor-pointer" @click="startAudio">
          Přehrát znovu
        </button>
      </div>
      <span v-if="audioError" class="text-xs text-destructive text-center">{{ audioError }}</span>
    </div>
  </div>
</template>
