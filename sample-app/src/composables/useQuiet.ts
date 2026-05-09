import { ref } from 'vue'

interface QuietTransmitter {
  transmit(data: ArrayBuffer): void
  destroy(): void
}

interface QuietReceiver {
  destroy(): void
}

interface QuietLib {
  addReadyCallback(success: () => void, error?: (err: unknown) => void): void
  transmitter(opts: {
    profile: string
    onFinish?: () => void
    onEnqueue?: () => void
  }): QuietTransmitter
  receiver(opts: {
    profile: string
    onReceive: (data: ArrayBuffer) => void
    onCreate?: () => void
    onCreateFail?: (reason: string) => void
  }): QuietReceiver
  str2ab(s: string): ArrayBuffer
  ab2str(ab: ArrayBuffer): string
}

declare global {
  interface Window {
    Quiet?: QuietLib
  }
}

let quietPromise: Promise<QuietLib> | null = null

function loadQuiet(): Promise<QuietLib> {
  if (!quietPromise) {
    quietPromise = new Promise<QuietLib>((resolve, reject) => {
      if (window.Quiet) {
        window.Quiet.addReadyCallback(() => resolve(window.Quiet!), reject)
        return
      }

      const script = document.createElement('script')
      script.src = '/quiet-bundle.js'
      script.onload = () => {
        if (!window.Quiet) {
          reject(new Error('Quiet not found on window after script load'))
          return
        }
        window.Quiet.addReadyCallback(() => resolve(window.Quiet!), reject)
      }
      script.onerror = () => reject(new Error('Failed to load quiet-bundle.js'))
      document.head.appendChild(script)
    })
  }
  return quietPromise
}

export function useQuietTransmit() {
  const isTransmitting = ref(false)
  const isDone = ref(false)
  const error = ref<string | null>(null)
  let tx: QuietTransmitter | null = null

  async function transmit(text: string): Promise<void> {
    if (isTransmitting.value) return
    error.value = null
    isDone.value = false
    isTransmitting.value = true

    try {
      const Quiet = await loadQuiet()
      tx = Quiet.transmitter({
        profile: 'audible',
        onFinish: () => {
          const finished = tx
          tx = null
          isTransmitting.value = false
          isDone.value = true
          setTimeout(() => finished?.destroy(), 0)
        },
      })
      tx.transmit(Quiet.str2ab(text))
    } catch {
      isTransmitting.value = false
      error.value = 'Zvukový přenos se nepodařilo spustit.'
    }
  }

  function stop() {
    const old = tx
    tx = null
    isTransmitting.value = false
    isDone.value = false
    error.value = null
    if (old) setTimeout(() => old.destroy(), 0)
  }

  return { isTransmitting, isDone, error, transmit, stop }
}

export function useQuietReceive() {
  const isListening = ref(false)
  const error = ref<string | null>(null)
  let rx: QuietReceiver | null = null
  let buffer = ''
  let silenceTimer: ReturnType<typeof setTimeout> | null = null
  const SILENCE_THRESHOLD_MS = 5000

  function isJsonComplete(str: string): boolean {
    if (!str.trim()) return false
    const trimmed = str.trim()

    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      let bracketCount = 0
      let braceCount = 0
      for (const char of trimmed) {
        if (char === '[') bracketCount++
        if (char === ']') bracketCount--
        if (char === '{') braceCount++
        if (char === '}') braceCount--
        if (bracketCount < 0 || braceCount < 0) return false
      }
      return bracketCount === 0 && braceCount === 0
    }

    return trimmed.length > 10
  }

  async function startListening(onReceive: (text: string) => void): Promise<void> {
    if (isListening.value) return
    error.value = null
    buffer = ''
    isListening.value = true

    try {
      const Quiet = await loadQuiet()
      rx = Quiet.receiver({
        profile: 'audible',
        onReceive: (data: ArrayBuffer) => {
          buffer += Quiet.ab2str(data)
          if (silenceTimer) clearTimeout(silenceTimer)
          if (isJsonComplete(buffer)) {
            // wait for silence to confirm transmission ended
            silenceTimer = setTimeout(() => {
              onReceive(buffer.trim())
              stop()
            }, SILENCE_THRESHOLD_MS)
          }
        },
        onCreateFail: (reason: string) => {
          error.value = reason || 'Přístup k mikrofonu byl zamítnut.'
          isListening.value = false
        },
      })
    } catch {
      isListening.value = false
      error.value = 'Nepodařilo se spustit zvukový přijímač.'
    }
  }

  function stop() {
    const old = rx
    rx = null
    isListening.value = false
    buffer = ''
    error.value = null
    if (silenceTimer) clearTimeout(silenceTimer)
    silenceTimer = null
    if (old) setTimeout(() => old.destroy(), 0)
  }

  return { isListening, error, startListening, stop }
}
