import { ref, watch, type Ref } from 'vue'

export function useAutoError(timeoutMs = 5000): Ref<string> {
  const error = ref('')
  let timer: ReturnType<typeof setTimeout> | null = null

  watch(error, (val) => {
    if (timer) clearTimeout(timer)
    if (val) {
      timer = setTimeout(() => {
        error.value = ''
      }, timeoutMs)
    }
  })

  return error
}
