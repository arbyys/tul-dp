import * as Evolu from '@evolu/common'

const ProfileId = Evolu.id('Profile')
type ProfileId = typeof ProfileId.Type
const ConnectedRoomId = Evolu.id('ConnectedRoom')
type ConnectedRoomId = typeof ConnectedRoomId.Type
const RoomId = Evolu.id('Room')
type RoomId = typeof RoomId.Type
const ItemId = Evolu.id('Item')
type ItemId = typeof ItemId.Type
const LoanId = Evolu.id('Loan')
type LoanId = typeof LoanId.Type
const MemberId = Evolu.id('Member')
type MemberId = typeof MemberId.Type

export const Schema = {
  profile: {
    id: ProfileId,
    displayName: Evolu.NonEmptyString100,
    email: Evolu.nullOr(Evolu.NonEmptyString100),
    theme: Evolu.nullOr(Evolu.NonEmptyString100),
  },
  connectedRoom: {
    id: ConnectedRoomId,
    roomName: Evolu.NonEmptyString100,
    roomMnemonic: Evolu.NonEmptyString1000,
  },
  room: {
    id: RoomId,
    name: Evolu.NonEmptyString100,
    building: Evolu.nullOr(Evolu.NonEmptyString100),
  },
  member: {
    id: MemberId,
    displayName: Evolu.NonEmptyString100,
    email: Evolu.nullOr(Evolu.NonEmptyString100),
    appOwnerId: Evolu.NonEmptyString100,
  },
  item: {
    id: ItemId,
    name: Evolu.NonEmptyString100,
    description: Evolu.nullOr(Evolu.String1000),
    category: Evolu.nullOr(Evolu.NonEmptyString100),
    serialNumber: Evolu.nullOr(Evolu.NonEmptyString100),
  },
  loan: {
    id: LoanId,
    itemId: ItemId,
    memberId: MemberId,
    borrowedAt: Evolu.DateIso,
    expectedReturnAt: Evolu.nullOr(Evolu.DateIso),
    returnedAt: Evolu.nullOr(Evolu.DateIso),
    notes: Evolu.nullOr(Evolu.String1000),
  },
}

export type Schema = typeof Schema

export type { ConnectedRoomId, ItemId, LoanId }
