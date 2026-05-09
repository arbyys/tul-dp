<script setup lang="ts">
import { refDebounced } from '@vueuse/core'
import { useRouteQuery } from '@vueuse/router'
import { sqliteTrue } from '@evolu/common'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import iconBackBlack from '../assets/icon-back-black.svg'
import iconBackWhite from '../assets/icon-back-white.svg'
import iconDotsBlack from '../assets/icon-dots-black.svg'
import iconDotsWhite from '../assets/icon-dots-white.svg'
import iconEditBlack from '../assets/icon-edit-black.svg'
import iconEditWhite from '../assets/icon-edit-white.svg'
import iconHistoryBlack from '../assets/icon-history-black.svg'
import iconHistoryWhite from '../assets/icon-history-white.svg'
import iconLeaveBlack from '../assets/icon-leave-black.svg'
import iconLeaveWhite from '../assets/icon-leave-white.svg'
import iconPlusBlack from '../assets/icon-plus-black.svg'
import iconPlusWhite from '../assets/icon-plus-white.svg'
import iconShareBlack from '../assets/icon-share-black.svg'
import iconShareWhite from '../assets/icon-share-white.svg'
import iconTrashBlack from '../assets/icon-trash-black.svg'
import iconTrashWhite from '../assets/icon-trash-white.svg'
import iconUserBlack from '../assets/icon-user-black.svg'
import iconUserWhite from '../assets/icon-user-white.svg'
import RoomConfirmDialog from '../components/room-detail/RoomConfirmDialog.vue'
import RoomDetailAvailableTab from '../components/room-detail/RoomDetailAvailableTab.vue'
import RoomDetailHistoryTab from '../components/room-detail/RoomDetailHistoryTab.vue'
import RoomDetailLoanedTab from '../components/room-detail/RoomDetailLoanedTab.vue'
import RoomMembersModal from '../components/room-detail/RoomMembersModal.vue'
import OverdueAlert from '../components/OverdueAlert.vue'
import { useAutoError } from '../composables/useAutoError'
import { useCurrentUser } from '../composables/useCurrentUser'
import { useIconTheme, useThemedIconVariant } from '../composables/useIconTheme'
import { evolu, createQuery } from '../db/evolu'
import type { ConnectedRoomId, ItemId, LoanId } from '../db/schema'
import { isLoanOverdue } from '../utils/date'
import { nowDateIso } from '../utils/evoluValue'
import { useRoomOwnerId } from '../composables/useRoomOwnerId'
import { useRoomDetail } from '../composables/useRoomDetail'
import { routeParamToString } from '../utils/routeParam'

type RoomTab = 'available' | 'loaned' | 'history'

function parseTabQueryValue(value: unknown): RoomTab {
  if (value === 'loaned' || value === 'history') return value
  return 'available'
}

const route = useRoute()
const router = useRouter()
const { ownerId } = useCurrentUser()
const { useBlackIcons } = useIconTheme()
const roomOwnerId = useRoomOwnerId()

const iconBack = useThemedIconVariant(useBlackIcons, iconBackBlack, iconBackWhite)
const iconDots = useThemedIconVariant(useBlackIcons, iconDotsBlack, iconDotsWhite)
const iconEdit = useThemedIconVariant(useBlackIcons, iconEditBlack, iconEditWhite)
const iconHistory = useThemedIconVariant(useBlackIcons, iconHistoryBlack, iconHistoryWhite)
const iconLeave = useThemedIconVariant(useBlackIcons, iconLeaveBlack, iconLeaveWhite)
const iconPlus = useThemedIconVariant(useBlackIcons, iconPlusBlack, iconPlusWhite)
const iconShare = useThemedIconVariant(useBlackIcons, iconShareBlack, iconShareWhite)
const iconTrash = useThemedIconVariant(useBlackIcons, iconTrashBlack, iconTrashWhite)
const iconUser = useThemedIconVariant(useBlackIcons, iconUserBlack, iconUserWhite)

const {
  activeLoans,
  currentRoomInfo,
  availableItems,
  availableItemRowsFor,
  groupedLoanedByMemberFor,
  memberLoanSummariesFor,
  historyEventsFor,
} = useRoomDetail(roomOwnerId)

const tab = useRouteQuery<RoomTab>('tab', 'available', {
  mode: 'replace',
  route,
  router,
  transform: (value) => parseTabQueryValue(value),
})
const searchTermInput = ref('')
const searchTerm = refDebounced(searchTermInput, 150)
const roomId = computed(() => routeParamToString(route.params.id) ?? '')

const ownerIdStr = computed(() => (ownerId.value ? String(ownerId.value) : ''))

const currentRoomBuildingLabel = computed(() => {
  const normalized = currentRoomInfo.value?.building?.trim().toUpperCase() ?? ''
  return normalized.length > 0 ? `Budova ${normalized}` : null
})

const myActiveLoans = computed(() =>
  activeLoans.value.filter((l) => l.appOwnerId === ownerIdStr.value),
)
const myOverdueLoans = computed(() =>
  myActiveLoans.value.filter((l) => isLoanOverdue(l.expectedReturnAt)),
)

const availableItemRowsResult = computed(() => availableItemRowsFor(searchTerm.value))
const filteredAvailableItems = computed(() => availableItemRowsResult.value.filteredAvailableItems)
const availableItemRows = computed(() => availableItemRowsResult.value.availableItemRows)

const groupedLoanedByMember = computed(() =>
  groupedLoanedByMemberFor(searchTerm.value, ownerIdStr.value),
)
const memberLoanSummaries = computed(() => memberLoanSummariesFor(ownerIdStr.value))
const historyEvents = computed(() => historyEventsFor())

const isSearchDisabled = computed(() => {
  if (tab.value === 'available') return availableItems.value.length === 0
  if (tab.value === 'loaned') return activeLoans.value.length === 0
  return false
})

function handleSearchInput(event: Event): void {
  if (isSearchDisabled.value) return
  searchTermInput.value = (event.target as HTMLInputElement).value
}

type ConfirmDialogState =
  | {
      type: 'return-loan'
      loanId: LoanId
      title: string
      confirmLabel: string
    }
  | {
      type: 'delete-item'
      itemId: ItemId
      title: string
      confirmLabel: string
    }
  | {
      type: 'delete-room'
      connectedRoomId: ConnectedRoomId
      title: string
      confirmLabel: string
    }

const confirmDialog = ref<ConfirmDialogState | null>(null)
const actionError = useAutoError()
const isMembersModalOpen = ref(false)
const expandedItemActionsId = ref<string | null>(null)

function showItemActions(itemId: string): void {
  expandedItemActionsId.value = expandedItemActionsId.value === itemId ? null : itemId
}

function isItemCurrentlyLoaned(itemId: string): boolean {
  return activeLoans.value.some((loan) => loan.itemId === itemId)
}

function handleReturn(loanId: LoanId): void {
  actionError.value = ''
  confirmDialog.value = {
    type: 'return-loan',
    loanId,
    title: 'Opravdu chcete vrátit tento předmět?',
    confirmLabel: 'Vrátit',
  }
}

function goToEditItem(itemId: ItemId): void {
  if (isItemCurrentlyLoaned(itemId)) {
    actionError.value = 'Předmět je aktuálně vypůjčený a nelze ho upravit.'
    return
  }
  expandedItemActionsId.value = null
  router.push(`/rooms/${route.params.id}/items/${String(itemId)}/edit`)
}

function requestDeleteItem(itemId: ItemId): void {
  if (isItemCurrentlyLoaned(itemId)) {
    actionError.value = 'Předmět je aktuálně vypůjčený a nelze ho smazat.'
    return
  }
  expandedItemActionsId.value = null
  actionError.value = ''
  confirmDialog.value = {
    type: 'delete-item',
    itemId,
    title: 'Opravdu chcete smazat tento předmět?',
    confirmLabel: 'Smazat',
  }
}

function requestDeleteRoom(): void {
  if (!roomId.value) return
  actionError.value = ''
  confirmDialog.value = {
    type: 'delete-room',
    connectedRoomId: roomId.value as ConnectedRoomId,
    title: 'Opravdu chcete opustit tuto místnost?',
    confirmLabel: 'Opustit místnost',
  }
}

function confirmDialogAction(): void {
  if (!confirmDialog.value) return

  const dialog = confirmDialog.value

  if (dialog.type === 'delete-room') {
    evolu.update('connectedRoom', { id: dialog.connectedRoomId, isDeleted: sqliteTrue })

    const sharedOwnerId = roomOwnerId.value
    const myOwnerId = ownerId.value
    if (sharedOwnerId && myOwnerId) {
      const myOwnerIdStr = String(myOwnerId)
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

    confirmDialog.value = null
    actionError.value = ''
    void router.push('/')
    return
  }

  if (!roomOwnerId.value) return

  if (dialog.type === 'return-loan') {
    evolu.update(
      'loan',
      {
        id: dialog.loanId,
        returnedAt: nowDateIso(),
      },
      { ownerId: roomOwnerId.value },
    )

    confirmDialog.value = null
    actionError.value = ''
    return
  }

  if (isItemCurrentlyLoaned(dialog.itemId)) {
    actionError.value = 'Předmět je aktuálně vypůjčený a nelze ho smazat.'
    confirmDialog.value = null
    return
  }

  evolu.update(
    'item',
    {
      id: dialog.itemId,
      isDeleted: sqliteTrue,
    },
    { ownerId: roomOwnerId.value },
  )

  confirmDialog.value = null
  actionError.value = ''
}

function cancelDialog(): void {
  confirmDialog.value = null
}

function openMembersModal(): void {
  isMembersModalOpen.value = true
}

function closeMembersModal(): void {
  isMembersModalOpen.value = false
}

function goToAddItem(): void {
  router.push(`/rooms/${roomId.value}/items/new`)
}

function goBack(): void {
  router.push('/')
}

function goToSettings(): void {
  router.push(`/rooms/${roomId.value}/settings`)
}

function goToLoanItem(itemId: string): void {
  router.push(`/rooms/${roomId.value}/items/${itemId}/loan`)
}
</script>

<template>
  <div class="relative flex flex-col gap-4 p-4">
    <div class="flex flex-row items-start justify-between gap-3">
      <div
        class="flex w-9 h-9 rounded-full bg-secondary border border-border items-center justify-center cursor-pointer"
        @click="goBack"
      >
        <img :src="iconBack" class="w-4 h-4" alt="" />
      </div>
      <div class="flex-1 flex flex-col">
        <span class="text-sm font-semibold text-card-foreground truncate">
          {{ currentRoomInfo?.name ?? 'Místnost' }}
        </span>
        <span v-if="currentRoomBuildingLabel" class="text-xs text-muted-foreground truncate">
          {{ currentRoomBuildingLabel }}
        </span>
      </div>
      <div class="flex flex-row items-center gap-2">
        <div
          class="w-[79px] h-8 bg-secondary rounded-md border border-border cursor-pointer flex flex-row items-center justify-between px-2"
          @click="goToSettings"
        >
          <span class="text-[11px] font-medium text-secondary-foreground">Sdílet</span>
          <img :src="iconShare" class="w-3.5 h-3.5 shrink-0" alt="" />
        </div>
        <div
          class="w-[79px] h-8 rounded-md bg-blue-500 border border-border cursor-pointer flex flex-row items-center justify-between px-2"
          @click="openMembersModal"
        >
          <span class="text-[11px] font-medium text-secondary-foreground">Členové</span>
          <img :src="iconUser" class="w-3.5 h-3.5 shrink-0" alt="" />
        </div>
        <div
          class="w-[79px] h-8 bg-destructive rounded-md border border-destructive cursor-pointer flex flex-row items-center justify-between px-2"
          @click="requestDeleteRoom"
        >
          <span class="text-[11px] font-medium text-destructive-foreground">Opustit</span>
          <img :src="iconLeave" class="w-3.5 h-3.5 shrink-0" alt="" />
        </div>
      </div>
    </div>

    <OverdueAlert :count="myOverdueLoans.length" />

    <div v-if="actionError" class="bg-destructive/10 rounded-lg p-3 border border-destructive/30">
      <span class="text-sm text-destructive">{{ actionError }}</span>
    </div>

    <div class="flex flex-row items-center gap-3 mt-5 px-4">
      <div class="flex-1 flex flex-row gap-1 bg-secondary rounded-lg p-1">
        <div class="w-[90%] flex flex-row gap-1">
          <div
            :class="[
              'flex flex-1 rounded-md py-2.5 items-center justify-center cursor-pointer',
              tab === 'available' ? 'bg-card' : '',
            ]"
            @click="tab = 'available'"
          >
            <span
              :class="[
                'text-sm font-medium',
                tab === 'available' ? 'text-card-foreground' : 'text-muted-foreground',
              ]"
            >
              Dostupné
            </span>
          </div>
          <div
            :class="[
              'flex flex-1 rounded-md py-2.5 items-center justify-center cursor-pointer',
              tab === 'loaned' ? 'bg-card' : '',
            ]"
            @click="tab = 'loaned'"
          >
            <span
              :class="[
                'text-sm font-medium',
                tab === 'loaned' ? 'text-card-foreground' : 'text-muted-foreground',
              ]"
            >
              Půjčené
            </span>
          </div>
        </div>
        <div class="w-[10%]">
          <div
            :class="[
              'flex w-full rounded-md py-2.5 items-center justify-center cursor-pointer',
              tab === 'history' ? 'bg-card' : '',
            ]"
            @click="tab = 'history'"
          >
            <img
              :src="iconHistory"
              :class="['w-5 h-5', tab === 'history' ? 'opacity-100' : 'opacity-60']"
              alt=""
            />
          </div>
        </div>
      </div>
      <div
        class="flex w-11 h-11 bg-primary rounded-lg items-center justify-center cursor-pointer"
        @click="goToAddItem"
      >
        <img :src="iconPlus" class="w-4 h-4" alt="" />
      </div>
    </div>

    <div class="flex flex-col">
      <div class="px-4">
        <div
          v-if="tab !== 'history'"
          :class="[
            'rounded-lg overflow-hidden mt-4 mb-1',
            isSearchDisabled ? 'cursor-not-allowed opacity-60' : '',
          ]"
        >
          <input
            :class="[
              'w-full px-3 py-2 text-sm',
              isSearchDisabled
                ? 'bg-secondary text-secondary-foreground/30 placeholder:text-secondary-foreground/30 pointer-events-none'
                : 'bg-secondary text-secondary-foreground',
            ]"
            placeholder="Hledat..."
            type="search"
            :readonly="isSearchDisabled"
            :value="searchTermInput"
            @input="handleSearchInput"
          />
        </div>
      </div>

      <!-- Tab: Dostupné -->
      <template v-if="tab === 'available'">
        <RoomDetailAvailableTab
          :available-item-rows="availableItemRows"
          :filtered-available-items="filteredAvailableItems"
          :search-term-input="searchTermInput"
          :expanded-item-actions-id="expandedItemActionsId"
          :icon-edit="iconEdit"
          :icon-trash="iconTrash"
          :icon-dots="iconDots"
          @show-item-actions="showItemActions"
          @go-to-edit-item="goToEditItem"
          @request-delete-item="requestDeleteItem"
          @go-to-loan-item="goToLoanItem"
        />
      </template>

      <template v-if="tab === 'loaned'">
        <RoomDetailLoanedTab
          :grouped-loaned-by-member="groupedLoanedByMember"
          :search-term-input="searchTermInput"
          @handle-return="handleReturn"
        />
      </template>

      <template v-if="tab === 'history'">
        <RoomDetailHistoryTab :history-events="historyEvents" />
      </template>
    </div>
  </div>

  <Teleport to="body">
    <RoomMembersModal
      :is-open="isMembersModalOpen"
      :member-loan-summaries="memberLoanSummaries"
      @close="closeMembersModal"
    />
  </Teleport>

  <Teleport to="body">
    <RoomConfirmDialog
      :confirm-dialog="confirmDialog"
      @confirm="confirmDialogAction"
      @cancel="cancelDialog"
    />
  </Teleport>
</template>
