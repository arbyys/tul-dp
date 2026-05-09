import {
  createSharedOwner,
  Mnemonic,
  mnemonicToOwnerSecret,
  sqliteTrue,
  type OwnerId,
} from '@evolu/common'
import type { SharedOwner } from '@evolu/common/local-first'
import { watch } from 'vue'
import { createSharedOwnerTransport, createQuery, evolu, useQuery } from '../db/evolu'
import { toNonEmpty100, toNullableNonEmpty100 } from '../utils/evoluValue'
import { useCurrentUser } from './useCurrentUser'

const sharedOwnerCache = new Map<string, SharedOwner>()

function deriveSharedOwner(mnemonic: string): SharedOwner | null {
  const cached = sharedOwnerCache.get(mnemonic)
  if (cached) return cached
  const result = Mnemonic.from(mnemonic)
  if (!result.ok) return null
  const owner = createSharedOwner(mnemonicToOwnerSecret(result.value))
  sharedOwnerCache.set(mnemonic, owner)
  return owner
}

export function useProfileSync(): void {
  const { ownerId, profile } = useCurrentUser()

  const connectedRoomsQuery = createQuery((db) =>
    db.selectFrom('connectedRoom').selectAll().where('isDeleted', 'is not', sqliteTrue),
  )
  const rooms = useQuery(connectedRoomsQuery)

  // Evolu's `useOwner` is in-memory only, so every session has to re-register
  // the shared owners derived from each connected room's mnemonic
  const registeredOwnerIds = new Set<OwnerId>()
  watch(
    rooms,
    (currentRooms) => {
      for (const room of currentRooms) {
        if (!room.roomMnemonic) continue
        const sharedOwner = deriveSharedOwner(room.roomMnemonic)
        if (!sharedOwner || registeredOwnerIds.has(sharedOwner.id)) continue
        registeredOwnerIds.add(sharedOwner.id)
        evolu.useOwner(sharedOwner, [createSharedOwnerTransport(sharedOwner.id)])
      }
    },
    { immediate: true },
  )

  // mirror the local profile into each room's member table
  watch(
    [profile, ownerId, rooms],
    ([currentProfile, currentOwnerId, currentRooms]) => {
      if (!currentProfile || !currentOwnerId || currentRooms.length === 0) return

      const ownerIdStr = String(currentOwnerId)
      const memberValues = {
        displayName: toNonEmpty100(currentProfile.displayName),
        email: toNullableNonEmpty100(currentProfile.email),
      }

      for (const room of currentRooms) {
        if (!room.roomMnemonic) continue
        const sharedOwner = deriveSharedOwner(room.roomMnemonic)
        if (!sharedOwner) continue

        const roomMembersQuery = createQuery((db) =>
          db
            .selectFrom('member')
            .selectAll()
            .where('isDeleted', 'is not', sqliteTrue)
            .where('ownerId', '=', sharedOwner.id),
        )

        void evolu.loadQuery(roomMembersQuery).then((members) => {
          const me = members.find((m) => m.appOwnerId === ownerIdStr)
          if (!me) {
            evolu.insert(
              'member',
              { ...memberValues, appOwnerId: toNonEmpty100(ownerIdStr) },
              { ownerId: sharedOwner.id },
            )
            return
          }
          if (
            me.displayName === currentProfile.displayName &&
            me.email === currentProfile.email
          ) {
            return
          }
          evolu.update(
            'member',
            { id: me.id, ...memberValues },
            { ownerId: sharedOwner.id },
          )
        })
      }
    },
    { immediate: true },
  )
}
