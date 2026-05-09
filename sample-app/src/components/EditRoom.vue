<script setup lang="ts">
import {
  createOwnerSecret,
  createRandomBytes,
  createSharedOwner,
  type OwnerId,
  ownerSecretToMnemonic,
  sqliteTrue,
} from '@evolu/common'
import { mnemonicToOwnerId } from '../utils/mnemonic'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import iconBackBlack from '../assets/icon-back-black.svg'
import iconBackWhite from '../assets/icon-back-white.svg'
import { useAutoError } from '../composables/useAutoError'
import { useCurrentUser } from '../composables/useCurrentUser'
import { useIconTheme, useThemedIconVariant } from '../composables/useIconTheme'
import {
  buildingCatalog,
  findRoomCatalogEntry,
  getRoomsForBuilding,
  normalizeRoomInput,
  type RoomCatalogEntry,
} from '../data/roomCatalog'
import { evolu, createQuery, useQuery } from '../db/evolu'
import { toNonEmpty100, toNonEmpty1000 } from '../utils/evoluValue'
import { routeParamToString } from '../utils/routeParam'

const props = withDefaults(
  defineProps<{
    embedded?: boolean
  }>(),
  { embedded: false },
)

const router = useRouter()
const route = useRoute()
const { useBlackIcons } = useIconTheme()
const iconBack = useThemedIconVariant(useBlackIcons, iconBackBlack, iconBackWhite)

const { profile } = useCurrentUser()

const roomName = ref('')
const building = ref('')
const error = useAutoError()
const saving = ref(false)
const showBuildingOptions = ref(false)
const showRoomSuggestions = ref(false)
const existingRoomCodesByBuilding = ref<Map<string, Set<string>>>(new Map())

const connectedRoomsQuery = createQuery((db) =>
  db.selectFrom('connectedRoom').select(['roomMnemonic']).where('isDeleted', 'is not', sqliteTrue),
)

const connectedRooms = useQuery(connectedRoomsQuery)

function getInputValue(event: Event): string {
  return (event.target as HTMLInputElement).value
}

function resolveBuildingCode(value: string): string | null {
  const normalized = value.trim().toUpperCase()
  if (normalized.length === 0) return null
  if (buildingCatalog.some((entry) => entry.code === normalized)) {
    return normalized
  }
  return null
}

function normalizeCatalogCode(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  if (normalized.length === 0) return null
  return normalized
}

async function refreshExistingRooms(): Promise<void> {
  const ownerIds = new Set<OwnerId>()
  for (const room of connectedRooms.value) {
    const ownerId = mnemonicToOwnerId(room.roomMnemonic)
    if (ownerId) ownerIds.add(ownerId)
  }

  const nextMap = new Map<string, Set<string>>()

  await Promise.all(
    [...ownerIds].map(async (ownerId) => {
      const roomQuery = createQuery((db) =>
        db
          .selectFrom('room')
          .select(['name', 'building'])
          .where('isDeleted', 'is not', sqliteTrue)
          .where('ownerId', '=', ownerId)
          .orderBy('createdAt', 'desc')
          .limit(1),
      )

      const rows = await evolu.loadQuery(roomQuery)
      const latestRoom = rows[0]
      const buildingCode = normalizeCatalogCode(latestRoom?.building)
      const roomCode = normalizeCatalogCode(latestRoom?.name)

      if (!buildingCode || !roomCode) return

      const existingCodes = nextMap.get(buildingCode) ?? new Set<string>()
      existingCodes.add(roomCode)
      nextMap.set(buildingCode, existingCodes)
    }),
  )

  existingRoomCodesByBuilding.value = nextMap
}

watch(
  connectedRooms,
  () => {
    void refreshExistingRooms()
  },
  { immediate: true, deep: true },
)

function isExistingRoomCode(buildingCode: string, roomCode: string): boolean {
  const existingCodes = existingRoomCodesByBuilding.value.get(buildingCode)
  if (!existingCodes) return false
  return existingCodes.has(roomCode.toUpperCase())
}

const selectedBuildingCode = computed(() => resolveBuildingCode(building.value))

const normalizedRoomName = computed(() =>
  normalizeRoomInput(selectedBuildingCode.value, roomName.value),
)

const roomSuggestions = computed<ReadonlyArray<RoomCatalogEntry>>(() => {
  if (!selectedBuildingCode.value) return []
  const availableRooms = getRoomsForBuilding(selectedBuildingCode.value).filter(
    (room) => !isExistingRoomCode(selectedBuildingCode.value as string, room.roomCode),
  )
  const query = normalizedRoomName.value.trim().toUpperCase()
  if (query.length === 0) {
    return availableRooms.slice(0, 8)
  }

  return availableRooms
    .filter((room) => {
      const roomCode = room.roomCode.toUpperCase()
      const fullCode = room.fullCode.toUpperCase()
      const description = room.description.toUpperCase()
      return roomCode.includes(query) || fullCode.includes(query) || description.includes(query)
    })
    .slice(0, 8)
})

const roomPlaceholder = computed(() => {
  if (!selectedBuildingCode.value) return 'Nejdřív vyberte budovu'
  const firstRoom = getRoomsForBuilding(selectedBuildingCode.value).find(
    (room) => !isExistingRoomCode(selectedBuildingCode.value as string, room.roomCode),
  )
  if (firstRoom) {
    return `např. ${firstRoom.fullCode}`
  }
  return `např. ${selectedBuildingCode.value}-001`
})

const filteredBuildingOptions = computed(() => {
  const query = building.value.trim().toUpperCase()
  if (query.length === 0) {
    return buildingCatalog
  }

  return buildingCatalog.filter((entry) => {
    const code = entry.code.toUpperCase()
    return code.includes(query)
  })
})

function goBack(): void {
  const routeId = routeParamToString(route.params.id)
  if (routeId) {
    router.push(`/rooms/${routeId}`)
    return
  }
  router.push('/')
}

function toggleBuildingOptions(): void {
  showBuildingOptions.value = !showBuildingOptions.value
}

function onBuildingInput(event: Event): void {
  const previousBuildingCode = selectedBuildingCode.value
  const nextValue = getInputValue(event).toUpperCase()
  const hasChanged = nextValue !== building.value
  building.value = nextValue

  const nextBuildingCode = resolveBuildingCode(building.value)
  if (previousBuildingCode !== nextBuildingCode) {
    roomName.value = ''
    showRoomSuggestions.value = false
  }

  if (hasChanged) {
    showBuildingOptions.value = true
  }

  error.value = ''
}

function handleBuildingConfirm(): void {
  const exactBuildingCode = resolveBuildingCode(building.value)
  if (exactBuildingCode) {
    selectBuilding(exactBuildingCode)
    return
  }
  showBuildingOptions.value = false
}

function selectBuilding(code: string): void {
  if (selectedBuildingCode.value !== code) {
    roomName.value = ''
    showRoomSuggestions.value = false
  }

  building.value = code
  error.value = ''
  showBuildingOptions.value = false
}

function onRoomInput(event: Event): void {
  const nextValue = getInputValue(event)
  const hasChanged = nextValue !== roomName.value
  roomName.value = nextValue

  if (hasChanged) {
    showRoomSuggestions.value = true
  }

  error.value = ''
}

function toggleRoomSuggestions(): void {
  if (!selectedBuildingCode.value) return
  showRoomSuggestions.value = !showRoomSuggestions.value
}

function selectRoomSuggestion(room: RoomCatalogEntry): void {
  roomName.value = room.roomCode
  showRoomSuggestions.value = false
  error.value = ''
}

function commitRoomSuggestion(): void {
  const exactMatch = findRoomCatalogEntry(selectedBuildingCode.value, roomName.value)
  if (exactMatch) {
    roomName.value = exactMatch.roomCode
  } else {
    roomName.value = normalizeRoomInput(selectedBuildingCode.value, roomName.value)
  }
  showRoomSuggestions.value = false
}

function handleRoomConfirm(): void {
  commitRoomSuggestion()
}

function handleCreate(): void {
  const p = profile.value
  if (!p?.displayName?.trim() || !p?.email?.trim()) {
    error.value = 'Pro vytvoření místnosti je nutné mít vyplněné jméno a email v Nastavení'
    return
  }

  if (!selectedBuildingCode.value) {
    error.value = 'Vyberte budovu'
    return
  }

  const trimmedName = normalizeRoomInput(selectedBuildingCode.value, roomName.value).trim()
  if (trimmedName.length === 0) {
    error.value = 'Název místnosti nesmí být prázdný'
    return
  }
  if (trimmedName.length > 100) {
    error.value = 'Název je příliš dlouhý (max 100 znaků)'
    return
  }

  const matchedRoom = findRoomCatalogEntry(selectedBuildingCode.value, trimmedName)
  const roomCodeToSave = matchedRoom?.roomCode ?? trimmedName
  const buildingCode = selectedBuildingCode.value

  saving.value = true
  error.value = ''

  const randomBytes = createRandomBytes()
  const secret = createOwnerSecret({ randomBytes })
  const sharedOwner = createSharedOwner(secret)
  const roomMnemonic = ownerSecretToMnemonic(secret)
  const roomNameToSave = toNonEmpty100(roomCodeToSave)
  const roomBuildingToSave = toNonEmpty100(buildingCode)
  const roomMnemonicToSave = toNonEmpty1000(roomMnemonic)

  evolu.useOwner(sharedOwner)

  evolu.insert(
    'room',
    { name: roomNameToSave, building: roomBuildingToSave },
    { ownerId: sharedOwner.id },
  )

  const connResult = evolu.insert('connectedRoom', {
    roomName: roomNameToSave,
    roomMnemonic: roomMnemonicToSave,
  })

  saving.value = false
  void router.push(`/rooms/${connResult.id}`)
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
        <span class="text-2xl font-bold text-card-foreground">Vytvořit místnost</span>
      </div>
      <span class="text-sm text-muted-foreground"> Vyberte budovu a zadejte kód místnosti. </span>
    </div>

    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium text-card-foreground">Budova *</span>
        <div class="bg-secondary rounded-lg px-4 py-2 flex flex-row items-center gap-2">
          <input
            class="flex-1 bg-transparent text-card-foreground/90 placeholder:text-muted-foreground text-base py-1 outline-none"
            placeholder="např. A"
            :value="building"
            @input="onBuildingInput"
            @keyup.enter="handleBuildingConfirm"
            @blur="handleBuildingConfirm"
          />
          <div
            class="flex w-7 h-7 items-center justify-center cursor-pointer"
            @click="toggleBuildingOptions"
          >
            <span class="text-base text-muted-foreground">
              {{ showBuildingOptions ? '▴' : '▾' }}
            </span>
          </div>
        </div>

        <div
          v-if="showBuildingOptions && filteredBuildingOptions.length > 0"
          class="overflow-y-auto max-h-52 bg-card rounded-lg border border-border"
        >
          <div
            v-for="entry in filteredBuildingOptions"
            :key="entry.code"
            class="flex flex-col px-4 py-3 border-b border-border/60 cursor-pointer"
            :class="selectedBuildingCode === entry.code ? 'bg-primary/10' : ''"
            @mousedown.prevent
            @click="selectBuilding(entry.code)"
          >
            <span class="text-sm font-medium text-card-foreground">{{ entry.code }}</span>
            <span class="text-xs text-muted-foreground mt-1">{{ entry.address }}</span>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium text-card-foreground">Místnost *</span>
        <div class="bg-secondary rounded-lg px-4 py-2 flex flex-row items-center gap-2">
          <input
            class="flex-1 bg-transparent text-card-foreground/90 placeholder:text-muted-foreground text-base py-1 outline-none"
            :placeholder="roomPlaceholder"
            :value="roomName"
            @input="onRoomInput"
            @keyup.enter="handleRoomConfirm"
            @blur="handleRoomConfirm"
          />
          <div
            class="flex w-7 h-7 items-center justify-center cursor-pointer"
            @click="toggleRoomSuggestions"
          >
            <span class="text-base text-muted-foreground">
              {{ showRoomSuggestions ? '▴' : '▾' }}
            </span>
          </div>
        </div>

        <div
          v-if="selectedBuildingCode && showRoomSuggestions && roomSuggestions.length > 0"
          class="overflow-y-auto bg-card max-h-52 rounded-lg border border-border"
        >
          <div
            v-for="room in roomSuggestions"
            :key="room.fullCode"
            class="flex flex-col px-4 py-3 border-b border-border/60 cursor-pointer"
            @mousedown.prevent
            @click="selectRoomSuggestion(room)"
          >
            <span class="text-sm font-medium text-card-foreground">{{ room.fullCode }}</span>
            <span class="text-xs text-muted-foreground mt-1">{{ room.description }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="error" class="bg-destructive/10 rounded-lg p-3">
      <span class="text-sm text-destructive">{{ error }}</span>
    </div>

    <div
      class="flex bg-primary rounded-lg py-3 items-center justify-center cursor-pointer"
      :class="saving ? 'opacity-50' : ''"
      @click="handleCreate"
    >
      <span class="text-base font-medium text-primary-foreground">
        {{ saving ? 'Vytvářím...' : 'Vytvořit místnost' }}
      </span>
    </div>
  </div>
</template>
