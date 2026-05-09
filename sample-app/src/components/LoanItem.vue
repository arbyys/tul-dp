<script setup lang="ts">
import { createIdenticon, createIdFromString, sqliteTrue } from '@evolu/common'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import iconBackBlack from '../assets/icon-back-black.svg'
import iconBackWhite from '../assets/icon-back-white.svg'
import iconWarning from '../assets/icon-warning.svg'
import { useAutoError } from '../composables/useAutoError'
import { useCurrentUser } from '../composables/useCurrentUser'
import { useIconTheme, useThemedIconVariant } from '../composables/useIconTheme'
import { useRoomOwnerId } from '../composables/useRoomOwnerId'
import { evolu, createQuery, useReactiveQuery } from '../db/evolu'
import {
  nowDateIso,
  toNonEmpty100,
  toNullableDateIsoFromDateInput,
  toNullableNonEmpty100,
  toNullableString1000,
} from '../utils/evoluValue'
import { routeParamToString } from '../utils/routeParam'

const route = useRoute()
const router = useRouter()
const { ownerId, profile } = useCurrentUser()
const { useBlackIcons } = useIconTheme()
const iconBack = useThemedIconVariant(useBlackIcons, iconBackBlack, iconBackWhite)
const roomOwnerId = useRoomOwnerId()

const itemId = computed(() => routeParamToString(route.params.itemId) ?? '')

const itemQuery = computed(() => {
  if (!roomOwnerId.value) return null
  return createQuery((db) =>
    db
      .selectFrom('item')
      .selectAll()
      .where('isDeleted', 'is not', sqliteTrue)
      .where('ownerId', '=', roomOwnerId.value),
  )
})

const membersQuery = computed(() => {
  if (!roomOwnerId.value) return null
  return createQuery((db) =>
    db
      .selectFrom('member')
      .selectAll()
      .where('isDeleted', 'is not', sqliteTrue)
      .where('ownerId', '=', roomOwnerId.value),
  )
})

const allItems = useReactiveQuery(itemQuery)
const allMembers = useReactiveQuery(membersQuery)

const item = computed(() => allItems.value.find((i) => i.id === itemId.value))

const myMember = computed(() => {
  if (!ownerId.value) return null
  const ownerStr = String(ownerId.value)
  return allMembers.value.find((m) => m.appOwnerId === ownerStr) ?? null
})

const expectedReturnAt = ref('')
const notes = ref('')
const error = useAutoError()
const saving = ref(false)

const userIdenticon = computed(() => {
  if (!ownerId.value) return null
  return createIdenticon(createIdFromString(String(ownerId.value)), 'github')
})

const isMissingProfileIdentity = computed(() => {
  const displayName = profile.value?.displayName?.trim() ?? ''
  const profileEmail = profile.value?.email?.trim() ?? ''
  return displayName.length === 0 || profileEmail.length === 0
})

const isMissingEmail = computed(() => {
  const profileEmail = profile.value?.email?.trim() ?? ''
  return profileEmail.length === 0
})

function goBack(): void {
  const routeRoomId = routeParamToString(route.params.roomId)
  if (routeRoomId) {
    router.push(`/rooms/${routeRoomId}`)
    return
  }
  router.push('/')
}

function handleLoan(): void {
  if (!roomOwnerId.value) {
    error.value = 'Místnost není aktivní'
    return
  }

  if (!profile.value || !ownerId.value) {
    error.value = 'Není nastaven profil. Vyplňte jméno a email v Nastavení.'
    return
  }

  if (isMissingProfileIdentity.value) {
    error.value = 'Pro výpůjčku je povinné jméno i email v Nastavení.'
    return
  }

  let borrowerMemberId = myMember.value?.id ?? null
  const memberProfile = {
    displayName: toNonEmpty100(profile.value.displayName),
    email: toNullableNonEmpty100(profile.value.email),
  }

  if (myMember.value) {
    const needsMemberUpdate =
      myMember.value.displayName !== profile.value.displayName ||
      myMember.value.email !== profile.value.email

    if (needsMemberUpdate) {
      evolu.update(
        'member',
        {
          id: myMember.value.id,
          ...memberProfile,
        },
        { ownerId: roomOwnerId.value },
      )
    }
  } else {
    const createMemberResult = evolu.insert(
      'member',
      {
        ...memberProfile,
        appOwnerId: toNonEmpty100(String(ownerId.value)),
      },
      { ownerId: roomOwnerId.value },
    )

    borrowerMemberId = createMemberResult.id
  }

  if (!borrowerMemberId || !item.value) {
    error.value = 'Nepodařilo se určit vypůjčitele nebo předmět'
    return
  }

  saving.value = true
  error.value = ''

  const trimmedNotes = notes.value.trim() || null
  const trimmedReturn = expectedReturnAt.value.trim() || null

  evolu.insert(
    'loan',
    {
      itemId: item.value.id,
      memberId: borrowerMemberId,
      borrowedAt: nowDateIso(),
      expectedReturnAt: toNullableDateIsoFromDateInput(trimmedReturn),
      returnedAt: null,
      notes: toNullableString1000(trimmedNotes),
    },
    { ownerId: roomOwnerId.value },
  )

  const routeRoomId = routeParamToString(route.params.roomId)
  if (routeRoomId) {
    router.push(`/rooms/${routeRoomId}`)
    return
  }
  router.push('/')
}
</script>

<template>
  <div class="p-6 flex flex-col gap-4">
    <div class="flex flex-col gap-2">
      <div class="flex flex-row items-center gap-3">
        <div
          class="flex w-8 h-8 rounded-full bg-secondary border border-border items-center justify-center cursor-pointer"
          @click="goBack"
        >
          <img :src="iconBack" class="w-4 h-4" alt="" />
        </div>
        <span class="text-2xl font-bold text-card-foreground">Půjčit předmět</span>
      </div>
      <div v-if="item" class="mt-3 flex flex-col gap-0.5">
        <span class="text-sm text-muted-foreground">
          <span class="font-medium text-card-foreground">Název:</span> {{ item.name }}
        </span>
        <span v-if="item.category" class="text-sm text-muted-foreground">
          <span class="font-medium text-card-foreground">Kategorie:</span> {{ item.category }}
        </span>
      </div>
    </div>

    <div class="bg-card rounded-lg p-4 border border-border flex flex-row items-center gap-3">
      <div
        v-if="userIdenticon"
        class="w-10 h-10 rounded-full overflow-hidden border border-border [&>svg]:w-full [&>svg]:h-full [&>svg]:block flex-shrink-0"
        v-html="userIdenticon"
      />
      <div class="flex flex-col gap-1">
        <span class="text-base font-medium text-card-foreground">
          {{ profile?.displayName ?? '—' }}
        </span>
        <div class="flex items-center gap-1.5">
          <img v-if="isMissingEmail" :src="iconWarning" class="w-5 h-5 shrink-0" alt="" />
          <span class="text-sm text-muted-foreground">
            {{ profile?.email ?? 'Email není vyplněn' }}
          </span>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-3 mt-5">
      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium text-card-foreground">Datum vrácení (volitelné)</span>
        <input
          type="date"
          class="bg-secondary text-secondary-foreground rounded-lg px-4 py-3 text-base"
          v-model="expectedReturnAt"
        />
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium text-card-foreground">Poznámky (volitelné)</span>
        <input
          class="bg-secondary text-secondary-foreground rounded-lg px-4 py-3 text-base"
          placeholder=""
          v-model="notes"
        />
      </div>
    </div>

    <div v-if="error" class="bg-destructive/10 rounded-lg p-3">
      <span class="text-sm text-destructive">{{ error }}</span>
    </div>

    <div
      class="flex bg-primary rounded-lg py-3 items-center justify-center cursor-pointer mt-5"
      :class="saving ? 'opacity-50' : ''"
      @click="handleLoan"
    >
      <span class="text-base font-medium text-primary-foreground">
        {{ saving ? 'Ukládám...' : 'Potvrdit' }}
      </span>
    </div>
  </div>
</template>
