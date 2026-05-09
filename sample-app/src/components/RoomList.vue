<script setup lang="ts">
import { sqliteTrue } from '@evolu/common'
import { mnemonicToOwnerId } from '../utils/mnemonic'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import QRCode from 'qrcode'
import RoomBulkActionBar from './room-list/RoomBulkActionBar.vue'
import RoomBulkLeaveConfirm from './room-list/RoomBulkLeaveConfirm.vue'
import RoomBulkShareModal from './room-list/RoomBulkShareModal.vue'
import { findRoomCatalogEntry, getBuildingLabel, sortBuildingCodes } from '../data/roomCatalog'
import { evolu, createQuery, useQuery } from '../db/evolu'
import { useQuietTransmit } from '../composables/useQuiet'
import type { ConnectedRoomId } from '../db/schema'
import { trimOrNull } from '../utils/string'

const router = useRouter()

const roomsQuery = createQuery((db) =>
  db
    .selectFrom('connectedRoom')
    .selectAll()
    .where('isDeleted', 'is not', sqliteTrue)
    .orderBy('createdAt', 'desc'),
)

const rooms = useQuery(roomsQuery)
const roomsLoading = ref(true)

interface RoomStats {
  available: number
  loaned: number
  overdue: number
  building: string | null
  loading: boolean
}

const emptyStats: RoomStats = {
  available: 0,
  loaned: 0,
  overdue: 0,
  building: null,
  loading: false,
}

const roomStats = ref<Record<string, RoomStats>>({})
const selectedBuildingFilters = ref<Array<string>>([])
const didInitializeBuildingSelection = ref(false)

interface RoomListEntry {
  id: string
  roomName: string | null
  roomMnemonic: string | null
  stats: RoomStats
  buildingCode: string | null
  roomDescription: string | null
}

interface RoomGroup {
  key: string
  title: string
  rooms: ReadonlyArray<RoomListEntry>
}

let unsubscribeStats: (() => void) | null = null

function subscribeRoomStats(): () => void {
  const cleanups: Array<() => void> = []

  const initial: Record<string, RoomStats> = {}
  for (const room of rooms.value) {
    initial[room.id] = roomStats.value[room.id] ?? { ...emptyStats, loading: true }
  }
  roomStats.value = initial

  for (const room of rooms.value) {
    const ownerId = mnemonicToOwnerId(room.roomMnemonic)
    if (!ownerId) continue
    const roomId = room.id

    const qItems = createQuery((db) =>
      db
        .selectFrom('item')
        .select('id')
        .where('isDeleted', 'is not', sqliteTrue)
        .where('ownerId', '=', ownerId),
    )
    const qLoans = createQuery((db) =>
      db
        .selectFrom('loan')
        .select('id')
        .where('isDeleted', 'is not', sqliteTrue)
        .where('ownerId', '=', ownerId)
        .where('returnedAt', 'is', null),
    )
    const qOverdue = createQuery((db) =>
      db
        .selectFrom('loan')
        .select('expectedReturnAt')
        .where('isDeleted', 'is not', sqliteTrue)
        .where('ownerId', '=', ownerId)
        .where('returnedAt', 'is', null)
        .where('expectedReturnAt', 'is not', null),
    )
    const qBuilding = createQuery((db) =>
      db
        .selectFrom('room')
        .select(['building'])
        .where('isDeleted', 'is not', sqliteTrue)
        .where('ownerId', '=', ownerId)
        .orderBy('createdAt', 'desc')
        .limit(1),
    )

    let itemCount = 0
    let loanCount = 0
    let overdueEntries: ReadonlyArray<{ expectedReturnAt: string | null }> = []
    let building: string | null = null
    let ready = false

    const commit = () => {
      if (!ready) return
      const now = new Date().toISOString()
      const overdueCount = overdueEntries.filter(
        (r) => r.expectedReturnAt !== null && r.expectedReturnAt < now,
      ).length
      roomStats.value = {
        ...roomStats.value,
        [roomId]: {
          available: Math.max(0, itemCount - loanCount),
          loaned: loanCount,
          overdue: overdueCount,
          building,
          loading: false,
        },
      }
    }

    void Promise.all([
      evolu.loadQuery(qItems),
      evolu.loadQuery(qLoans),
      evolu.loadQuery(qOverdue),
      evolu.loadQuery(qBuilding),
    ]).then(([ir, lr, or_, br]) => {
      itemCount = ir.length
      loanCount = lr.length
      overdueEntries = or_
      building = br[0]?.building ?? null
      ready = true
      commit()
    })

    cleanups.push(
      evolu.subscribeQuery(qItems)(() => {
        itemCount = evolu.getQueryRows(qItems).length
        commit()
      }),
      evolu.subscribeQuery(qLoans)(() => {
        loanCount = evolu.getQueryRows(qLoans).length
        commit()
      }),
      evolu.subscribeQuery(qOverdue)(() => {
        overdueEntries = evolu.getQueryRows(qOverdue)
        commit()
      }),
      evolu.subscribeQuery(qBuilding)(() => {
        building = evolu.getQueryRows(qBuilding)[0]?.building ?? null
        commit()
      }),
    )
  }

  return () => cleanups.forEach((fn) => fn())
}

function statsForRoom(roomId: string): RoomStats {
  return roomStats.value[roomId] ?? emptyStats
}

function normalizeBuildingCode(value: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  return trimmed.toUpperCase()
}

const roomEntries = computed<ReadonlyArray<RoomListEntry>>(() =>
  rooms.value.map((room) => {
    const stats = statsForRoom(room.id)
    const buildingCode = normalizeBuildingCode(stats.building)
    const catalogEntry = findRoomCatalogEntry(buildingCode, room.roomName)

    return {
      id: room.id,
      roomName: room.roomName,
      roomMnemonic: room.roomMnemonic,
      stats,
      buildingCode,
      roomDescription: catalogEntry?.description ?? null,
    }
  }),
)

const buildingFilters = computed<ReadonlyArray<string>>(() => {
  const codes = new Set<string>()
  for (const room of roomEntries.value) {
    if (room.buildingCode) {
      codes.add(room.buildingCode)
    }
  }
  return sortBuildingCodes([...codes])
})

const selectedBuildingCodes = computed<ReadonlyArray<string>>(() => {
  if (buildingFilters.value.length === 0) return []
  const availableCodes = new Set(buildingFilters.value)
  return selectedBuildingFilters.value.filter((code) => availableCodes.has(code))
})

const isAllBuildingsSelected = computed(() => {
  if (buildingFilters.value.length === 0) return false
  return selectedBuildingCodes.value.length === buildingFilters.value.length
})

const filteredRooms = computed<ReadonlyArray<RoomListEntry>>(() => {
  if (buildingFilters.value.length === 0) return roomEntries.value
  if (selectedBuildingCodes.value.length === 0) return []
  const selectedSet = new Set(selectedBuildingCodes.value)

  return roomEntries.value.filter((room) => {
    if (!room.buildingCode) {
      return isAllBuildingsSelected.value
    }
    return selectedSet.has(room.buildingCode)
  })
})

const groupedRooms = computed<ReadonlyArray<RoomGroup>>(() => {
  const knownGroups = new Map<string, Array<RoomListEntry>>()
  const unknownRooms: Array<RoomListEntry> = []

  for (const room of filteredRooms.value) {
    if (room.buildingCode) {
      const list = knownGroups.get(room.buildingCode) ?? []
      list.push(room)
      knownGroups.set(room.buildingCode, list)
      continue
    }
    unknownRooms.push(room)
  }

  const groups: Array<RoomGroup> = []
  for (const code of sortBuildingCodes([...knownGroups.keys()])) {
    const roomsInGroup = knownGroups.get(code) ?? []
    groups.push({
      key: code,
      title: getBuildingLabel(code),
      rooms: roomsInGroup,
    })
  }

  if (unknownRooms.length > 0 && isAllBuildingsSelected.value) {
    groups.push({
      key: 'unassigned',
      title: 'Nezařazené',
      rooms: unknownRooms,
    })
  }

  return groups
})

watch(
  rooms,
  () => {
    if (rooms.value.length > 0) {
      roomsLoading.value = false
    }
    if (unsubscribeStats) {
      unsubscribeStats()
      unsubscribeStats = null
    }
    unsubscribeStats = subscribeRoomStats()
  },
  { immediate: true, deep: true },
)

onMounted(async () => {
  try {
    await Promise.race([
      evolu.loadQuery(roomsQuery),
      new Promise<void>((resolve) => setTimeout(resolve, 8000)),
    ])
  } catch {
    // best-effort warm-up; UI hides loading state regardless
  } finally {
    roomsLoading.value = false
  }
})

watch(
  buildingFilters,
  (currentFilters, oldFilters) => {
    if (currentFilters.length === 0) {
      selectedBuildingFilters.value = []
      didInitializeBuildingSelection.value = false
      return
    }

    if (!didInitializeBuildingSelection.value) {
      selectedBuildingFilters.value = [...currentFilters]
      didInitializeBuildingSelection.value = true
      return
    }

    const currentFilterSet = new Set(currentFilters)
    const prevFilterSet = new Set(oldFilters ?? [])
    const keptSelection = selectedBuildingFilters.value.filter((code) => currentFilterSet.has(code))
    const newCodes = currentFilters.filter((code) => !prevFilterSet.has(code))
    const nextSelection = [...new Set([...keptSelection, ...newCodes])]
    if (
      nextSelection.length !== selectedBuildingFilters.value.length ||
      nextSelection.some((code, index) => code !== selectedBuildingFilters.value[index])
    ) {
      selectedBuildingFilters.value = nextSelection
    }
  },
  { immediate: true },
)

function goToRoom(id: string): void {
  router.push(`/rooms/${id}`)
}

function goToAddRoom(): void {
  router.push('/rooms/add')
}

function toggleBuildingFilter(code: string): void {
  if (buildingFilters.value.length === 0) return

  const currentSelection = selectedBuildingCodes.value

  if (currentSelection.includes(code)) {
    const nextSelection = currentSelection.filter((selectedCode) => selectedCode !== code)
    selectedBuildingFilters.value = nextSelection
    return
  }

  const nextSelection = [...currentSelection, code]
  selectedBuildingFilters.value = nextSelection
}

function isBuildingSelected(code: string): boolean {
  return selectedBuildingCodes.value.includes(code)
}

const selectedRoomIds = ref<Set<string>>(new Set())
const hasSelection = computed(() => selectedRoomIds.value.size > 0)

function toggleRoomSelection(id: string): void {
  const next = new Set(selectedRoomIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedRoomIds.value = next
}

function isRoomSelected(id: string): boolean {
  return selectedRoomIds.value.has(id)
}

function clearSelection(): void {
  selectedRoomIds.value = new Set()
}

const selectedRooms = computed(() =>
  roomEntries.value.filter((r) => selectedRoomIds.value.has(r.id)),
)

const showBulkShareModal = ref(false)
const bulkShareTab = ref<'qr' | 'manual' | 'audio'>('qr')
const bulkShareQrUrl = ref<string | null>(null)
const {
  isTransmitting,
  isDone: audioIsDone,
  error: audioError,
  transmit,
  stop: stopAudio,
} = useQuietTransmit()

const bulkSharePayload = computed((): string | null => {
  const sel = selectedRooms.value
  if (sel.length === 0) return null
  if (sel.length === 1) return trimOrNull(sel[0]?.roomMnemonic)
  const items: Array<{ n: string; m: string }> = []
  for (const r of sel) {
    const m = trimOrNull(r.roomMnemonic)
    if (m) items.push({ n: r.roomName ?? '', m })
  }
  return items.length > 0 ? JSON.stringify(items) : null
})

const bulkShareManualText = computed((): string | null => {
  const sel = selectedRooms.value
  if (sel.length === 0) return null
  const mnemonics: Array<string> = []
  for (const r of sel) {
    const m = trimOrNull(r.roomMnemonic)
    if (m) mnemonics.push(m)
  }
  return mnemonics.length > 0 ? mnemonics.join('; ') : null
})

watch(
  bulkSharePayload,
  async (payload) => {
    if (!payload) {
      bulkShareQrUrl.value = null
      return
    }
    bulkShareQrUrl.value = await QRCode.toDataURL(payload, { width: 256, margin: 2 })
  },
  { immediate: true },
)

function openBulkShare(): void {
  bulkShareTab.value = 'qr'
  stopAudio()
  showBulkShareModal.value = true
}

function closeBulkShare(): void {
  stopAudio()
  showBulkShareModal.value = false
}

async function startBulkAudio(): Promise<void> {
  if (!bulkSharePayload.value) return
  await transmit(bulkSharePayload.value)
}

const showBulkLeaveConfirm = ref(false)

function requestBulkLeave(): void {
  showBulkLeaveConfirm.value = true
}

function confirmBulkLeave(): void {
  const myOwnerIdStr = evolu.appOwner?.id ? String(evolu.appOwner.id) : null

  for (const room of selectedRooms.value) {
    evolu.update('connectedRoom', { id: room.id as ConnectedRoomId, isDeleted: sqliteTrue })

    if (myOwnerIdStr) {
      const sharedOwnerId = mnemonicToOwnerId(room.roomMnemonic)
      if (sharedOwnerId) {
        void evolu
          .loadQuery(
            createQuery((db) =>
              db
                .selectFrom('member')
                .select(['id', 'appOwnerId'])
                .where('isDeleted', 'is not', sqliteTrue)
                .where('ownerId', '=', sharedOwnerId),
            ),
          )
          .then((rows) => {
            for (const row of rows) {
              if (String(row.appOwnerId) === myOwnerIdStr) {
                evolu.update(
                  'member',
                  { id: row.id, isDeleted: sqliteTrue },
                  { ownerId: sharedOwnerId },
                )
              }
            }
          })
      }
    }
  }

  showBulkLeaveConfirm.value = false
  clearSelection()
}

function cancelBulkLeave(): void {
  showBulkLeaveConfirm.value = false
}

onUnmounted(() => {
  if (unsubscribeStats) unsubscribeStats()
  stopAudio()
})
</script>

<template>
  <div :class="['flex flex-col gap-4 p-4', hasSelection ? 'pb-28' : '']">
    <div
      v-if="rooms.length === 0 && roomsLoading"
      class="flex flex-col rounded-lg p-6 items-center justify-center"
    >
      <div class="inline-flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
        <span
          class="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:120ms]"
        />
        <span
          class="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:240ms]"
        />
      </div>
    </div>

    <div
      v-else-if="rooms.length === 0"
      class="flex flex-col bg-card rounded-lg p-6 border border-border items-center justify-center gap-4"
    >
      <span class="text-muted-foreground text-sm"> Zatím nemáte žádné místnosti. </span>
      <div
        class="flex w-full bg-primary rounded-lg py-3 items-center justify-center cursor-pointer"
        @click="goToAddRoom"
      >
        <span class="text-sm font-medium text-primary-foreground">Přidat místnost</span>
      </div>
    </div>

    <template v-else>
      <div class="flex flex-row">
        <div
          class="flex w-full bg-primary rounded-lg py-3 items-center justify-center cursor-pointer"
          @click="goToAddRoom"
        >
          <span class="text-sm font-medium text-primary-foreground cursor-pointer"
            >Přidat místnost</span
          >
        </div>
      </div>

      <!-- building filters -->
      <div
        v-if="rooms.length > 0 && buildingFilters.length > 0"
        class="flex flex-row flex-wrap gap-2 mb-4"
      >
        <div
          v-for="code in buildingFilters"
          :key="code"
          class="rounded-full px-3 py-2 border cursor-pointer flex justify-center items-center"
          :class="
            isBuildingSelected(code)
              ? 'bg-secondary/80 border-opacity-0'
              : 'bg-background border-border/80'
          "
          @click="toggleBuildingFilter(code)"
        >
          <span class="text-xs font-semibold text-card-foreground">
            {{ getBuildingLabel(code) }}
          </span>
        </div>
      </div>

      <div
        v-if="rooms.length > 0 && groupedRooms.length === 0"
        class="flex rounded-lg p-6 items-center justify-center"
      >
        <span class="text-muted-foreground text-sm">
          Pro vybraný filtr nejsou dostupné žádné místnosti.
        </span>
      </div>

      <!-- Grouped room list -->
      <div
        v-for="(group, groupIndex) in groupedRooms"
        :key="group.key"
        class="flex flex-col gap-1"
        :class="groupIndex === 0 ? '' : 'mt-2'"
      >
        <div class="px-1">
          <span class="text-sm font-semibold text-card-foreground bg-background py-1 rounded-md">
            {{ group.title }}
          </span>
        </div>

        <div class="flex flex-col gap-1">
          <div v-for="room in group.rooms" :key="room.id" class="flex flex-row items-center gap-2">
            <!-- Room card -->
            <div
              class="flex-1 bg-card rounded-lg p-4 border border-border cursor-pointer"
              :class="isRoomSelected(room.id) ? 'border-primary/60' : ''"
              @click="goToRoom(room.id)"
            >
              <div class="flex flex-row items-center justify-between gap-3">
                <div class="flex-1 flex flex-col min-w-0">
                  <span class="text-base font-medium text-card-foreground truncate">{{
                    room.roomName || 'Bez názvu'
                  }}</span>
                  <span
                    v-if="room.roomDescription"
                    class="text-xs text-muted-foreground mt-1 truncate"
                  >
                    {{ room.roomDescription }}
                  </span>
                </div>
                <div v-if="room.stats.loading">
                  <span class="text-xs text-muted-foreground">…</span>
                </div>
                <div v-else class="flex flex-row items-center gap-2">
                  <div
                    class="relative flex min-w-7 h-7 px-2 rounded-md items-center justify-center overflow-hidden"
                    title="K dispozici"
                  >
                    <div
                      :class="[
                        'absolute inset-0 rounded-md',
                        room.stats.available === 0 ? 'bg-success/30' : 'bg-success',
                      ]"
                    />
                    <span
                      :class="[
                        'relative text-xs font-semibold',
                        room.stats.available === 0
                          ? 'text-success-foreground/40'
                          : 'text-success-foreground',
                      ]"
                      >{{ room.stats.available }}</span
                    >
                  </div>
                  <div
                    class="relative flex min-w-7 h-7 px-2 rounded-md items-center justify-center overflow-hidden"
                    title="Vypůjčené"
                  >
                    <div
                      :class="[
                        'absolute inset-0 rounded-md',
                        room.stats.loaned === 0 ? 'bg-loaned/40' : 'bg-loaned',
                      ]"
                    />
                    <span
                      :class="[
                        'relative text-xs font-semibold',
                        room.stats.loaned === 0
                          ? 'text-loaned-foreground/40'
                          : 'text-loaned-foreground',
                      ]"
                      >{{ room.stats.loaned }}</span
                    >
                  </div>
                  <div
                    class="relative flex min-w-7 h-7 px-2 rounded-md items-center justify-center overflow-hidden"
                    title="Po termínu"
                  >
                    <div
                      :class="[
                        'absolute inset-0 rounded-md',
                        room.stats.overdue === 0 ? 'bg-destructive/30' : 'bg-destructive',
                      ]"
                    />
                    <span
                      :class="[
                        'relative text-xs font-semibold',
                        room.stats.overdue === 0
                          ? 'text-destructive-foreground/40'
                          : 'text-destructive-foreground',
                      ]"
                      >{{ room.stats.overdue }}</span
                    >
                  </div>
                </div>
              </div>
            </div>
            <!-- bulk select checkbox -->
            <div
              class="flex-shrink-0 flex w-5 h-5 items-center justify-center cursor-pointer"
              @click.stop="toggleRoomSelection(room.id)"
            >
              <div
                :class="[
                  'w-5 h-5 rounded border-2 flex items-center justify-center',
                  isRoomSelected(room.id)
                    ? 'bg-primary border-primary'
                    : 'bg-transparent border-border',
                ]"
              >
                <span
                  v-if="isRoomSelected(room.id)"
                  class="text-primary-foreground text-[10px] font-bold leading-none"
                  >✓</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>

  <Teleport to="body">
    <RoomBulkActionBar
      :is-visible="hasSelection"
      :selected-count="selectedRoomIds.size"
      @open-share="openBulkShare"
      @request-leave="requestBulkLeave"
      @cancel="clearSelection"
    />
  </Teleport>

  <Teleport to="body">
    <RoomBulkShareModal
      :is-open="showBulkShareModal"
      :selected-count="selectedRoomIds.size"
      :bulk-share-tab="bulkShareTab"
      :bulk-share-qr-url="bulkShareQrUrl"
      :bulk-share-manual-text="bulkShareManualText"
      :is-transmitting="isTransmitting"
      :audio-is-done="audioIsDone"
      :audio-error="audioError"
      @close="closeBulkShare"
      @set-tab="bulkShareTab = $event"
      @start-audio="startBulkAudio"
      @stop-audio="stopAudio"
    />
  </Teleport>

  <Teleport to="body">
    <RoomBulkLeaveConfirm
      :is-open="showBulkLeaveConfirm"
      :selected-count="selectedRoomIds.size"
      @confirm="confirmBulkLeave"
      @cancel="cancelBulkLeave"
    />
  </Teleport>
</template>
