<script setup lang="ts">
import QrScanner from 'qr-scanner'
import { onUnmounted, ref, useTemplateRef } from 'vue'
import { useQuietReceive } from '../composables/useQuiet'

type ReceiveTab = 'qr' | 'manual' | 'audio'

const emit = defineEmits<{ received: [mnemonic: string] }>()

const activeTab = ref<ReceiveTab>('qr')
const manualInput = ref('')
const qrError = ref<string | null>(null)
const videoRef = useTemplateRef<HTMLVideoElement>('videoEl')

const { isListening, error: audioError, startListening, stop: stopAudio } = useQuietReceive()

let scanner: QrScanner | null = null

async function startQrScanner() {
  qrError.value = null
  const video = videoRef.value
  if (!video) return

  try {
    scanner = new QrScanner(
      video,
      (result) => {
        const text = result.data.trim()
        if (text.split(/\s+/).length >= 24) {
          stopQrScanner()
          emit('received', text)
        }
      },
      {
        preferredCamera: 'environment',
        highlightScanRegion: true,
        highlightCodeOutline: true,
      },
    )
    await scanner.start()
  } catch {
    qrError.value = 'Nelze spustit kameru. Zkontrolujte oprávnění.'
  }
}

function stopQrScanner() {
  scanner?.stop()
  scanner?.destroy()
  scanner = null
}

function onTabChange(tab: ReceiveTab) {
  if (activeTab.value === 'qr') stopQrScanner()
  if (activeTab.value === 'audio') stopAudio()
  activeTab.value = tab
}

function onQrTabMounted() {
  void startQrScanner()
}

const wordCount = ref(0)
const mnemonicIndex = ref(0)

function onManualInput(e: Event) {
  const value = (e.target as HTMLInputElement).value
  manualInput.value = value
  if (value.includes(';')) {
    const parts = value.split(';')
    mnemonicIndex.value = parts.length
    const last = (parts[parts.length - 1] ?? '').trim()
    wordCount.value = last ? last.split(/\s+/).length : 0
  } else {
    mnemonicIndex.value = 0
    const clean = value.trim()
    wordCount.value = clean ? clean.split(/\s+/).length : 0
  }
}

function submitManual() {
  const text = manualInput.value.trim()
  if (text.includes(';')) {
    if (text.length > 0) emit('received', text)
    return
  }
  const normalized = text.replace(/\s+/g, ' ')
  if (normalized.split(' ').length < 24) return
  emit('received', normalized)
}

async function startAudio() {
  await startListening((text) => emit('received', text))
}

onUnmounted(() => {
  stopQrScanner()
  stopAudio()
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-row gap-1 bg-secondary rounded-lg p-1">
      <button
        v-for="(label, key) in { qr: 'QR kód', manual: 'Ručně', audio: 'Zvuk' }"
        :key="key"
        :class="[
          'flex flex-1 rounded-md py-2 items-center justify-center cursor-pointer text-sm font-medium',
          activeTab === key ? 'bg-card text-card-foreground' : 'text-muted-foreground',
        ]"
        @click="onTabChange(key as ReceiveTab)"
      >
        {{ label }}
      </button>
    </div>

    <div
      v-if="activeTab === 'qr'"
      class="flex flex-col items-center gap-3"
      @vue:mounted="onQrTabMounted"
    >
      <span class="text-xs text-muted-foreground text-center mt-2"
        >Namiřte kameru na QR kód mnemoniku.</span
      >
      <div
        class="w-full rounded-lg overflow-hidden border border-border bg-black aspect-square max-w-64"
      >
        <video ref="videoEl" class="w-full h-full object-cover" />
      </div>
      <span v-if="qrError" class="text-xs text-destructive text-center">{{ qrError }}</span>
    </div>

    <div v-if="activeTab === 'manual'" class="flex flex-col gap-3">
      <div class="flex flex-col gap-2 mt-2">
        <textarea
          class="w-full bg-secondary text-secondary-foreground rounded-lg px-4 py-3 text-sm font-mono resize-none"
          placeholder="Zadejte mnemonic..."
          rows="3"
          maxlength="2000"
          :value="manualInput"
          @input="onManualInput"
        />
        <span class="text-xs text-muted-foreground mt-1">
          <template v-if="mnemonicIndex > 0">
            <b>Mnemonic #{{ mnemonicIndex }}: </b>
            <span class="ml-1">{{ wordCount }} / 24 slov</span>
          </template>
          <template v-else>{{ wordCount }} / 24 slov</template>
        </span>
      </div>
      <div
        class="flex bg-primary rounded-lg py-3 items-center justify-center cursor-pointer"
        :class="
          (manualInput.includes(';') ? manualInput.trim().length === 0 : wordCount < 24)
            ? 'opacity-40 pointer-events-none'
            : ''
        "
        @click="submitManual"
      >
        <span class="text-sm font-medium text-primary-foreground">Potvrdit</span>
      </div>
    </div>

    <div v-if="activeTab === 'audio'" class="flex flex-col items-center gap-3">
      <span class="text-xs text-muted-foreground text-center mt-2"
        >Spusťte poslouchání, přibližte vysílací zařízení a klikněte na přehrát.</span
      >
      <div v-if="!isListening">
        <div
          class="flex bg-primary rounded-lg px-6 py-3 items-center justify-center cursor-pointer"
          @click="startAudio"
        >
          <span class="text-sm font-medium text-primary-foreground">Spustit poslouchání</span>
        </div>
      </div>
      <div v-else class="flex flex-col items-center gap-2">
        <div class="flex gap-1 items-end">
          <span
            v-for="i in 5"
            :key="i"
            class="block w-1.5 bg-primary rounded-full animate-pulse"
            :style="`height: ${8 + i * 4}px; animation-delay: ${i * 100}ms`"
          />
        </div>
        <span class="text-sm text-card-foreground">Poslouchám…</span>
        <button class="text-xs text-muted-foreground underline cursor-pointer" @click="stopAudio">
          Zastavit
        </button>
      </div>
      <span v-if="audioError" class="text-xs text-destructive text-center">{{ audioError }}</span>
    </div>
  </div>
</template>
