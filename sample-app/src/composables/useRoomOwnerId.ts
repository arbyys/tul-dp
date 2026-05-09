import {
  createSharedOwner,
  Mnemonic,
  mnemonicToOwnerSecret,
  sqliteTrue,
  type OwnerId,
} from '@evolu/common'
import { computed, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { createQuery, useQuery } from '../db/evolu'
import { routeParamToString } from '../utils/routeParam'

export function useRoomOwnerId(): Readonly<Ref<OwnerId | null>> {
  const route = useRoute()

  const connectedRoomsQuery = createQuery((db) =>
    db
      .selectFrom('connectedRoom')
      .select(['id', 'roomMnemonic'])
      .where('isDeleted', 'is not', sqliteTrue),
  )

  const rooms = useQuery(connectedRoomsQuery)

  const roomId = computed(
    () => routeParamToString(route.params.id) ?? routeParamToString(route.params.roomId),
  )

  return computed(() => {
    if (!roomId.value) return null

    const room = rooms.value.find((entry) => entry.id === roomId.value)
    const roomMnemonic = room?.roomMnemonic?.trim()
    if (!roomMnemonic) return null

    const mnemonicResult = Mnemonic.from(roomMnemonic)
    if (!mnemonicResult.ok) return null

    return createSharedOwner(mnemonicToOwnerSecret(mnemonicResult.value)).id
  })
}
