import type { ItemId, LoanId } from '../db/schema'

export type HistoryEventType = 'borrowed' | 'returned' | 'edited' | 'deleted'

export interface HistoryEvent {
  id: string
  itemName: string
  itemCategory: string | null
  message: string
  eventType: HistoryEventType
  at: string
  sortAt: number
}

export interface LoanEntry {
  id: LoanId
  itemId: ItemId
  memberId: string
  itemName: string | null
  itemCategory: string | null
  itemSerialNumber: string | null
  borrowerName: string | null
  appOwnerId: string | null
  borrowedAt: string | null
  expectedReturnAt: string | null
  returnedAt: string | null
  notes: string | null
}

export interface LoanGroup {
  key: string
  displayName: string
  appOwnerId: string | null
  isCurrentUser: boolean
  loans: ReadonlyArray<LoanEntry>
  overdueCount: number
}

export interface MemberLoanSummary {
  memberId: string
  displayName: string
  displayMail: string
  appOwnerId: string | null
  totalLoanCount: number
  activeLoanCount: number
  overdueLoanCount: number
  isCurrentUser: boolean
}

export interface RoomItem {
  id: ItemId
  name: string | null
  category: string | null
  description: string | null
}
