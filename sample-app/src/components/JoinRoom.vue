<script setup lang="ts">
import {
  createSharedOwner,
  Mnemonic,
  mnemonicToOwnerSecret,
  sqliteTrue,
} from '@evolu/common'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import iconBackBlack from '../assets/icon-back-black.svg'
import iconBackWhite from '../assets/icon-back-white.svg'
import iconWarning from '../assets/icon-warning.svg'
import { useAutoError } from '../composables/useAutoError'
import { useCurrentUser } from '../composables/useCurrentUser'
import { useIconTheme, useThemedIconVariant } from '../composables/useIconTheme'
import { evolu, createQuery, createSharedOwnerTransport } from '../db/evolu'
import { toNonEmpty1000, toNullableNonEmpty100 } from '../utils/evoluValue'
import MnemonicReceive from './MnemonicReceive.vue'

const props = withDefaults(
  defineProps<{
    embedded?: boolean
  }>(),
  { embedded: false },
)

const router = useRouter()
const { useBlackIcons } = useIconTheme()
const iconBack = useThemedIconVariant(useBlackIcons, iconBackBlack, iconBackWhite)

const { profile } = useCurrentUser()
const hasCompleteProfile = computed(() => {
  const p = profile.value
  return !!(p?.displayName?.trim() && p?.email?.trim())
})

const error = useAutoError()

function goBack(): void {
  router.push('/')
}

async function joinRoomWithMnemonic(rawMnemonic: string): Promise<boolean> {
  const trimmed = rawMnemonic.trim().replace(/\s+/g, ' ')

  if (trimmed.split(' ').length !== 24) {
    error.value = 'Mnemonic musí obsahovat přesně 24 slov'
    return false
  }

  const mnemonicResult = Mnemonic.from(trimmed)
  if (!mnemonicResult.ok) {
    error.value = 'Neplatný mnemonic'
    return false
  }

  const mnemonicValue = toNonEmpty1000(trimmed)

  const existing = await evolu.loadQuery(
    createQuery((db) =>
      db
        .selectFrom('connectedRoom')
        .select('id')
        .where('isDeleted', 'is not', sqliteTrue)
        .where('roomMnemonic', '=', mnemonicValue),
    ),
  )
  if (existing.length > 0) {
    error.value = 'K této místnosti jste již připojeni.'
    return false
  }

  const secret = mnemonicToOwnerSecret(mnemonicResult.value)
  const sharedOwner = createSharedOwner(secret)
  evolu.useOwner(sharedOwner, [createSharedOwnerTransport(sharedOwner.id)])

  // wait for the room name to sync from the shared owner before persisting
  // the local connectedRoom row — the list shows nothing for this room until
  // the real name is available
  const roomNameQuery = createQuery((db) =>
    db
      .selectFrom('room')
      .select(['name'])
      .where('isDeleted', 'is not', sqliteTrue)
      .where('ownerId', '=', sharedOwner.id)
      .orderBy('createdAt', 'asc')
      .limit(1),
  )

  const insertConnectedRoom = (name: string | null | undefined): boolean => {
    const roomName = toNullableNonEmpty100(name ?? null)
    if (!roomName) return false
    evolu.insert('connectedRoom', { roomName, roomMnemonic: mnemonicValue })
    return true
  }

  void evolu.loadQuery(roomNameQuery).then((rows) => {
    if (insertConnectedRoom(rows[0]?.name)) return
    const unsubscribe = evolu.subscribeQuery(roomNameQuery)(() => {
      if (insertConnectedRoom(evolu.getQueryRows(roomNameQuery)[0]?.name)) unsubscribe()
    })
  })

  return true
}

async function onMnemonicReceived(text: string): Promise<void> {
  error.value = ''
  const trimmed = text.trim()

  // multi-room JSON payload: [{"n":"name","m":"mnemonic"},...]
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (!Array.isArray(parsed) || parsed.length === 0) {
        error.value = 'JSON musí obsahovat pole místností.'
        return
      }
      const mnemonics: Array<string> = []
      for (const item of parsed) {
        if (item && typeof item === 'object' && 'm' in item && typeof item.m === 'string') {
          mnemonics.push(item.m)
        }
      }
      if (mnemonics.length === 0) {
        error.value = 'JSON obsahuje pole, ale bez validních mnemonik (chybí pole "m").'
        return
      }
      const results = await Promise.all(mnemonics.map((m) => joinRoomWithMnemonic(m)))
      if (results.some(Boolean)) void router.push('/')
      return
    } catch (e) {
      error.value = `Chyba při parsování JSON: ${e instanceof Error ? e.message : 'Neznámá chyba'}`
      return
    }
  }

  if (trimmed.includes(';')) {
    const parts = trimmed
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    if (parts.length > 0) {
      const results = await Promise.all(parts.map((m) => joinRoomWithMnemonic(m)))
      if (results.some(Boolean)) void router.push('/')
      return
    }
  }

  if (await joinRoomWithMnemonic(trimmed)) void router.push('/')
}
</script>

<template>
  <div :class="[props.embedded ? 'p-0' : 'p-6', 'flex flex-col gap-6']">
    <div class="flex flex-col gap-2">
      <div v-if="!props.embedded" class="flex flex-row items-center gap-3">
        <div
          class="flex w-8 h-8 rounded-full bg-secondary border border-border items-center justify-center cursor-pointer"
          @click="goBack"
        >
          <img :src="iconBack" class="w-4 h-4" alt="" />
        </div>
        <span class="text-2xl font-bold text-card-foreground">Připojit se k místnosti</span>
      </div>
      <span class="text-sm text-muted-foreground">
        Zadejte mnemonic existující místnosti, který jste obdrželi od správce.
      </span>
    </div>

    <div v-if="!hasCompleteProfile" class="flex flex-col gap-3">
      <div
        class="bg-destructive/10 rounded-lg p-3 border border-destructive/20 flex flex-row items-start gap-2"
      >
        <img :src="iconWarning" class="w-4 h-4 shrink-0 mt-0.5" alt="" />
        <span class="text-sm text-destructive">
          Pro připojení k místnosti je nutné mít vyplněné jméno a email v
          <span class="underline cursor-pointer" @click="router.push('/profile')">Nastavení</span>.
        </span>
      </div>
    </div>

    <template v-else>
      <MnemonicReceive @received="onMnemonicReceived" />

      <div v-if="error" class="bg-destructive/10 rounded-lg p-3">
        <span class="text-sm text-destructive">{{ error }}</span>
      </div>
    </template>
  </div>
</template>
