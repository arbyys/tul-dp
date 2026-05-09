import { sqliteTrue, type OwnerId } from '@evolu/common'
import { computed, type ComputedRef, type Ref } from 'vue'
import { createQuery, useReactiveQuery } from '../db/evolu'
import type { ItemId, LoanId } from '../db/schema'
import type {
  HistoryEvent,
  LoanEntry,
  LoanGroup,
  MemberLoanSummary,
  RoomItem,
} from '../types/roomDetail'
import { dateToSortKey, isLoanOverdue } from '../utils/date'
import { isNonEmptyString } from '../utils/string'

interface LoanRow {
  id: LoanId
  itemId: ItemId
  memberId: string
  borrowedAt: string | null
  expectedReturnAt: string | null
  returnedAt: string | null
  notes: string | null
  itemName: string | null
  itemCategory: string | null
  itemSerialNumber: string | null
  borrowerName: string | null
  appOwnerId: string | null
}

interface ItemRow {
  id: ItemId
  name: string | null
  category: string | null
  description: string | null
  serialNumber: string | null
  isDeleted: unknown
  createdAt: string | null
  updatedAt: string | null
}

interface MemberRow {
  id: string
  displayName: string | null
  email: string | null
  appOwnerId: string | null
}

interface RoomInfoRow {
  name: string | null
  building: string | null
}

const LOAN_SELECT = [
  'loan.id',
  'loan.itemId',
  'loan.memberId',
  'loan.borrowedAt',
  'loan.expectedReturnAt',
  'loan.returnedAt',
  'loan.notes',
  'item.name as itemName',
  'item.category as itemCategory',
  'item.serialNumber as itemSerialNumber',
  'member.displayName as borrowerName',
  'member.appOwnerId',
] as const

function toLoanEntry(row: LoanRow): LoanEntry {
  return {
    id: row.id,
    itemId: row.itemId,
    memberId: String(row.memberId),
    itemName: row.itemName,
    itemCategory: row.itemCategory,
    itemSerialNumber: row.itemSerialNumber,
    borrowerName: row.borrowerName,
    appOwnerId: row.appOwnerId,
    borrowedAt: row.borrowedAt,
    expectedReturnAt: row.expectedReturnAt,
    returnedAt: row.returnedAt,
    notes: row.notes,
  }
}

function toRoomItem(row: ItemRow): RoomItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
  }
}

function matchesSearch(values: ReadonlyArray<string | null>, searchTerm: string): boolean {
  const query = searchTerm.trim().toLowerCase()
  if (query.length === 0) return true
  return values.some((value) => typeof value === 'string' && value.toLowerCase().includes(query))
}

function isSoftDeleted(value: unknown): boolean {
  return value === sqliteTrue
}

export interface UseRoomDetail {
  activeLoans: ComputedRef<ReadonlyArray<LoanEntry>>
  currentRoomInfo: ComputedRef<RoomInfoRow | null>
  availableItems: ComputedRef<ReadonlyArray<RoomItem>>
  availableItemRowsFor: (searchTerm: string) => {
    filteredAvailableItems: ReadonlyArray<RoomItem>
    availableItemRows: ReadonlyArray<ReadonlyArray<RoomItem>>
  }
  groupedLoanedByMemberFor: (searchTerm: string, ownerIdStr: string) => ReadonlyArray<LoanGroup>
  memberLoanSummariesFor: (ownerIdStr: string) => ReadonlyArray<MemberLoanSummary>
  historyEventsFor: () => ReadonlyArray<HistoryEvent>
}

export function useRoomDetail(roomOwnerId: Readonly<Ref<string | null>>): UseRoomDetail {
  const asOwnerId = () => roomOwnerId.value as OwnerId

  const activeLoansQuery = computed(() => {
    if (!roomOwnerId.value) return null
    return createQuery((db) =>
      db
        .selectFrom('loan')
        .innerJoin('item', 'item.id', 'loan.itemId')
        .innerJoin('member', 'member.id', 'loan.memberId')
        .select(LOAN_SELECT)
        .where('loan.isDeleted', 'is not', sqliteTrue)
        .where('loan.ownerId', '=', asOwnerId())
        .where('item.ownerId', '=', asOwnerId())
        .where('member.ownerId', '=', asOwnerId())
        .where('loan.returnedAt', 'is', null)
        .orderBy('loan.borrowedAt', 'desc'),
    )
  })

  const allLoansQuery = computed(() => {
    if (!roomOwnerId.value) return null
    return createQuery((db) =>
      db
        .selectFrom('loan')
        .innerJoin('item', 'item.id', 'loan.itemId')
        .innerJoin('member', 'member.id', 'loan.memberId')
        .select(LOAN_SELECT)
        .where('loan.isDeleted', 'is not', sqliteTrue)
        .where('loan.ownerId', '=', asOwnerId())
        .where('item.ownerId', '=', asOwnerId())
        .where('member.ownerId', '=', asOwnerId())
        .orderBy('loan.borrowedAt', 'desc'),
    )
  })

  const allItemsQuery = computed(() => {
    if (!roomOwnerId.value) return null
    return createQuery((db) =>
      db
        .selectFrom('item')
        .selectAll()
        .where('isDeleted', 'is not', sqliteTrue)
        .where('ownerId', '=', asOwnerId())
        .orderBy('name', 'asc'),
    )
  })

  const allItemsHistoryQuery = computed(() => {
    if (!roomOwnerId.value) return null
    return createQuery((db) =>
      db.selectFrom('item').selectAll().where('ownerId', '=', asOwnerId()).orderBy('updatedAt', 'desc'),
    )
  })

  const roomInfoQuery = computed(() => {
    if (!roomOwnerId.value) return null
    return createQuery((db) =>
      db
        .selectFrom('room')
        .select(['name', 'building'])
        .where('isDeleted', 'is not', sqliteTrue)
        .where('ownerId', '=', asOwnerId())
        .orderBy('createdAt', 'desc')
        .limit(1),
    )
  })

  const membersQuery = computed(() => {
    if (!roomOwnerId.value) return null
    return createQuery((db) =>
      db
        .selectFrom('member')
        .select(['id', 'displayName', 'email', 'appOwnerId'])
        .where('isDeleted', 'is not', sqliteTrue)
        .where('ownerId', '=', asOwnerId())
        .orderBy('displayName', 'asc'),
    )
  })

  const activeLoanRows = useReactiveQuery(activeLoansQuery) as Readonly<Ref<ReadonlyArray<LoanRow>>>
  const allLoanRows = useReactiveQuery(allLoansQuery) as Readonly<Ref<ReadonlyArray<LoanRow>>>
  const itemRows = useReactiveQuery(allItemsQuery) as Readonly<Ref<ReadonlyArray<ItemRow>>>
  const itemHistoryRows = useReactiveQuery(allItemsHistoryQuery) as Readonly<
    Ref<ReadonlyArray<ItemRow>>
  >
  const roomInfoRows = useReactiveQuery(roomInfoQuery) as Readonly<
    Ref<ReadonlyArray<RoomInfoRow>>
  >
  const memberRows = useReactiveQuery(membersQuery) as Readonly<Ref<ReadonlyArray<MemberRow>>>

  const activeLoans = computed<ReadonlyArray<LoanEntry>>(() => activeLoanRows.value.map(toLoanEntry))
  const items = computed<ReadonlyArray<RoomItem>>(() => itemRows.value.map(toRoomItem))

  const currentRoomInfo = computed(() => roomInfoRows.value[0] ?? null)

  const loanedItemIds = computed(() => new Set(activeLoans.value.map((l) => l.itemId)))
  const availableItems = computed<ReadonlyArray<RoomItem>>(() =>
    items.value.filter((item) => !loanedItemIds.value.has(item.id)),
  )

  function availableItemRowsFor(searchTerm: string) {
    const filteredAvailableItems = availableItems.value.filter((item) =>
      matchesSearch([item.name, item.category], searchTerm),
    )
    const availableItemRows: Array<ReadonlyArray<RoomItem>> = []
    for (let i = 0; i < filteredAvailableItems.length; i += 2) {
      availableItemRows.push(filteredAvailableItems.slice(i, i + 2))
    }
    return { filteredAvailableItems, availableItemRows }
  }

  function groupedLoanedByMemberFor(searchTerm: string, ownerIdStr: string): ReadonlyArray<LoanGroup> {
    const filtered = activeLoans.value.filter((loan) =>
      matchesSearch([loan.itemName, loan.itemCategory, loan.itemSerialNumber, loan.borrowerName], searchTerm),
    )

    const groups = new Map<string, { displayName: string; appOwnerId: string | null; loans: Array<LoanEntry> }>()
    for (const loan of filtered) {
      const key = loan.memberId
      let group = groups.get(key)
      if (!group) {
        group = {
          displayName: isNonEmptyString(loan.borrowerName) ? loan.borrowerName : 'Neznámý člen',
          appOwnerId: loan.appOwnerId,
          loans: [],
        }
        groups.set(key, group)
      }
      group.loans.push(loan)
    }

    return [...groups.entries()].map(([key, group]) => {
      const sortedLoans = [...group.loans].sort(
        (a, b) => dateToSortKey(b.borrowedAt) - dateToSortKey(a.borrowedAt),
      )
      return {
        key,
        displayName: group.displayName,
        appOwnerId: group.appOwnerId,
        isCurrentUser: group.appOwnerId === ownerIdStr,
        loans: sortedLoans,
        overdueCount: sortedLoans.filter((loan) => isLoanOverdue(loan.expectedReturnAt)).length,
      }
    })
  }

  function memberLoanSummariesFor(ownerIdStr: string): ReadonlyArray<MemberLoanSummary> {
    const totals = new Map<string, number>()
    const active = new Map<string, number>()
    const overdue = new Map<string, number>()
    const activeMemberIds = new Set(memberRows.value.map((m) => String(m.id)))

    for (const row of allLoanRows.value) {
      const key = String(row.memberId)
      if (!activeMemberIds.has(key)) continue
      totals.set(key, (totals.get(key) ?? 0) + 1)
    }

    for (const loan of activeLoans.value) {
      const key = loan.memberId
      if (!activeMemberIds.has(key)) continue
      active.set(key, (active.get(key) ?? 0) + 1)
      if (isLoanOverdue(loan.expectedReturnAt)) {
        overdue.set(key, (overdue.get(key) ?? 0) + 1)
      }
    }

    const summaries: Array<MemberLoanSummary> = memberRows.value.map((member) => {
      const memberId = String(member.id)
      const memberOwnerId = isNonEmptyString(member.appOwnerId) ? member.appOwnerId : null
      return {
        memberId,
        displayName: isNonEmptyString(member.displayName) ? member.displayName : 'Neznámý člen',
        displayMail: isNonEmptyString(member.email) ? member.email : 'Neznámý e-mail',
        appOwnerId: memberOwnerId,
        totalLoanCount: totals.get(memberId) ?? 0,
        activeLoanCount: active.get(memberId) ?? 0,
        overdueLoanCount: overdue.get(memberId) ?? 0,
        isCurrentUser: memberOwnerId !== null && memberOwnerId === ownerIdStr,
      }
    })

    summaries.sort((a, b) => {
      if (a.isCurrentUser !== b.isCurrentUser) return a.isCurrentUser ? -1 : 1
      if (b.activeLoanCount !== a.activeLoanCount) return b.activeLoanCount - a.activeLoanCount
      if (b.totalLoanCount !== a.totalLoanCount) return b.totalLoanCount - a.totalLoanCount
      return a.displayName.localeCompare(b.displayName, 'cs')
    })
    return summaries
  }

  function historyEventsFor(): ReadonlyArray<HistoryEvent> {
    const events: Array<HistoryEvent> = []

    for (const row of allLoanRows.value) {
      const loanId = String(row.id)
      const itemName = row.itemName ?? 'Neznámý předmět'
      const itemCategory = row.itemCategory
      const borrowerName = row.borrowerName ?? 'Neznámý uživatel'

      if (row.borrowedAt) {
        events.push({
          id: `${loanId}-borrowed-${row.borrowedAt}`,
          itemName,
          itemCategory,
          message: borrowerName,
          eventType: 'borrowed',
          at: row.borrowedAt,
          sortAt: dateToSortKey(row.borrowedAt),
        })
      }
      if (row.returnedAt) {
        events.push({
          id: `${loanId}-returned-${row.returnedAt}`,
          itemName,
          itemCategory,
          message: borrowerName,
          eventType: 'returned',
          at: row.returnedAt,
          sortAt: dateToSortKey(row.returnedAt),
        })
      }
    }

    for (const item of itemHistoryRows.value) {
      const itemId = String(item.id)
      const itemName = item.name ?? 'Neznámý předmět'
      const itemCategory = item.category
      const { createdAt, updatedAt } = item

      if (isSoftDeleted(item.isDeleted) && updatedAt) {
        events.push({
          id: `${itemId}-deleted-${updatedAt}`,
          itemName,
          itemCategory,
          message: 'Předmět byl odstraněn',
          eventType: 'deleted',
          at: updatedAt,
          sortAt: dateToSortKey(updatedAt),
        })
        continue
      }

      if (createdAt && updatedAt && createdAt !== updatedAt) {
        events.push({
          id: `${itemId}-edited-${updatedAt}`,
          itemName,
          itemCategory,
          message: 'Předmět byl upraven',
          eventType: 'edited',
          at: updatedAt,
          sortAt: dateToSortKey(updatedAt),
        })
      }
    }

    return events.sort((a, b) => b.sortAt - a.sortAt)
  }

  return {
    activeLoans,
    currentRoomInfo,
    availableItems,
    availableItemRowsFor,
    groupedLoanedByMemberFor,
    memberLoanSummariesFor,
    historyEventsFor,
  }
}
