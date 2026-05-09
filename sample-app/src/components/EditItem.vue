<script setup lang="ts">
import { sqliteTrue } from '@evolu/common'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import iconBackBlack from '../assets/icon-back-black.svg'
import iconBackWhite from '../assets/icon-back-white.svg'
import { useAutoError } from '../composables/useAutoError'
import { useIconTheme, useThemedIconVariant } from '../composables/useIconTheme'
import { useRoomOwnerId } from '../composables/useRoomOwnerId'
import { evolu, createQuery, useReactiveQuery } from '../db/evolu'
import { toNonEmpty100, toNullableNonEmpty100, toNullableString1000 } from '../utils/evoluValue'
import { routeParamToString } from '../utils/routeParam'

const route = useRoute()
const router = useRouter()
const { useBlackIcons } = useIconTheme()
const iconBack = useThemedIconVariant(useBlackIcons, iconBackBlack, iconBackWhite)
const roomOwnerId = useRoomOwnerId()

const roomId = computed(() => {
  return routeParamToString(route.params.roomId) ?? ''
})

const itemId = computed(() => {
  return routeParamToString(route.params.itemId)
})

const isEditing = computed(() => itemId.value !== null)

const itemsQuery = computed(() => {
  if (!roomOwnerId.value) return null
  return createQuery((db) =>
    db
      .selectFrom('item')
      .selectAll()
      .where('isDeleted', 'is not', sqliteTrue)
      .where('ownerId', '=', roomOwnerId.value),
  )
})

const activeLoansQuery = computed(() => {
  if (!roomOwnerId.value) return null
  return createQuery((db) =>
    db
      .selectFrom('loan')
      .select(['itemId'])
      .where('isDeleted', 'is not', sqliteTrue)
      .where('ownerId', '=', roomOwnerId.value)
      .where('returnedAt', 'is', null),
  )
})

const itemsRows = useReactiveQuery(itemsQuery)
const activeLoanRows = useReactiveQuery(activeLoansQuery)

const editItem = computed(() => {
  if (!isEditing.value || !itemId.value) return null
  return itemsRows.value.find((item) => item.id === itemId.value) ?? null
})

const isLoaned = computed(() => {
  if (!itemId.value) return false
  return activeLoanRows.value.some((loan) => loan.itemId === itemId.value)
})
const didPrefill = ref(false)

const name = ref('')
const category = ref('')
const serialNumber = ref('')
const description = ref('')
const error = useAutoError()
const saving = ref(false)

function goBack(): void {
  if (roomId.value.length > 0) {
    router.push(`/rooms/${roomId.value}`)
    return
  }
  router.push('/')
}

watch(
  editItem,
  (item) => {
    if (!isEditing.value || didPrefill.value || !item) return
    name.value = item.name ?? ''
    category.value = item.category ?? ''
    serialNumber.value = item.serialNumber ?? ''
    description.value = item.description ?? ''
    didPrefill.value = true
  },
  { immediate: true },
)

watch(
  isEditing,
  (editing) => {
    if (!editing) didPrefill.value = true
  },
  { immediate: true },
)

function handleSave(): void {
  if (!roomOwnerId.value) {
    error.value = 'Místnost není aktivní'
    return
  }

  if (isEditing.value && !editItem.value) {
    error.value = 'Předmět nebyl nalezen'
    return
  }

  if (isEditing.value && isLoaned.value) {
    error.value = 'Předmět je aktuálně vypůjčený a nelze ho upravit'
    return
  }

  const trimmedName = name.value.trim()
  if (trimmedName.length === 0) {
    error.value = 'Název předmětu nesmí být prázdný'
    return
  }
  if (trimmedName.length > 100) {
    error.value = 'Název je příliš dlouhý (max 100 znaků)'
    return
  }

  const trimmedCategory = category.value.trim() || null
  if (trimmedCategory && trimmedCategory.length > 100) {
    error.value = 'Kategorie je příliš dlouhá (max 100 znaků)'
    return
  }

  const trimmedSerial = serialNumber.value.trim() || null
  if (trimmedSerial && trimmedSerial.length > 100) {
    error.value = 'Sériové číslo je příliš dlouhé (max 100 znaků)'
    return
  }

  const trimmedDesc = description.value.trim() || null
  if (trimmedDesc && trimmedDesc.length > 1000) {
    error.value = 'Popis je příliš dlouhý (max 1000 znaků)'
    return
  }

  saving.value = true
  error.value = ''

  const itemValues = {
    name: toNonEmpty100(trimmedName),
    category: toNullableNonEmpty100(trimmedCategory),
    serialNumber: toNullableNonEmpty100(trimmedSerial),
    description: toNullableString1000(trimmedDesc),
  }

  if (isEditing.value && editItem.value) {
    evolu.update('item', { id: editItem.value.id, ...itemValues }, { ownerId: roomOwnerId.value })
  } else {
    evolu.insert('item', itemValues, { ownerId: roomOwnerId.value })
  }

  router.push(`/rooms/${roomId.value}`)
}
</script>

<template>
  <div class="p-6 flex flex-col gap-6">
    <div class="flex flex-col gap-2">
      <div class="flex flex-row items-center gap-3">
        <div
          class="flex w-8 h-8 rounded-full bg-secondary border border-border items-center justify-center cursor-pointer"
          @click="goBack"
        >
          <img :src="iconBack" class="w-4 h-4" alt="" />
        </div>
        <span class="text-2xl font-bold text-card-foreground">
          {{ isEditing ? 'Upravit předmět' : 'Přidat předmět' }}
        </span>
      </div>
      <span class="text-sm text-muted-foreground">
        {{
          isEditing
            ? 'Upravte údaje předmětu v místnosti.'
            : 'Zadejte údaje o novém předmětu do místnosti.'
        }}
      </span>
    </div>

    <div
      v-if="isEditing && isLoaned"
      class="bg-destructive/10 rounded-lg p-3 border border-destructive/30"
    >
      <span class="text-sm text-destructive">
        Předmět je právě vypůjčený. Úpravy jsou možné až po vrácení.
      </span>
    </div>

    <div class="flex flex-col gap-3">
      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium text-card-foreground">Název *</span>
        <input
          class="bg-secondary text-secondary-foreground rounded-lg px-4 py-3 text-base"
          placeholder="např. Multimetr Fluke 87V"
          v-model="name"
        />
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium text-card-foreground">Kategorie (volitelné)</span>
        <input
          class="bg-secondary text-secondary-foreground rounded-lg px-4 py-3 text-base"
          placeholder="např. měřicí přístroje"
          v-model="category"
        />
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium text-card-foreground">Sériové číslo (volitelné)</span>
        <input
          class="bg-secondary text-secondary-foreground rounded-lg px-4 py-3 text-base"
          placeholder=""
          v-model="serialNumber"
        />
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium text-card-foreground">Popis (volitelné)</span>
        <textarea
          class="bg-secondary text-secondary-foreground rounded-lg px-4 py-3 text-base resize-y min-h-24"
          placeholder="Doplňující informace o předmětu"
          rows="3"
          v-model="description"
        />
      </div>
    </div>

    <div v-if="error" class="bg-destructive/10 rounded-lg p-3">
      <span class="text-sm text-destructive">{{ error }}</span>
    </div>

    <div
      class="flex bg-primary rounded-lg py-3 items-center justify-center cursor-pointer"
      :class="saving || (isEditing && isLoaned) ? 'opacity-50' : ''"
      @click="handleSave"
    >
      <span class="text-base font-medium text-primary-foreground">
        {{ saving ? 'Ukládám...' : isEditing ? 'Uložit změny' : 'Potvrdit' }}
      </span>
    </div>
  </div>
</template>
