import type { OwnerId } from '@evolu/common'
import { sqliteTrue } from '@evolu/common'
import { computed, type Ref } from 'vue'
import { evolu, createQuery, useQuery } from '../db/evolu'

interface UserProfile {
  displayName: string
  email: string | null
  theme: string | null
}

export function useCurrentUser(): {
  ownerId: Ref<OwnerId | null>
  profile: Readonly<Ref<UserProfile | null>>
  hasProfile: Readonly<Ref<boolean>>
} {
  const ownerId = computed(() => evolu?.appOwner?.id ?? null)

  const profileQuery = createQuery((db) =>
    db
      .selectFrom('profile')
      .selectAll()
      .where('isDeleted', 'is not', sqliteTrue)
      .limit(1),
  )

  const rows = useQuery(profileQuery)

  const profile = computed((): UserProfile | null => {
    const row = rows.value[0]
    if (!row?.displayName) return null
    return {
      displayName: row.displayName,
      email: row.email ?? null,
      theme: typeof row.theme === 'string' ? row.theme : null,
    }
  })

  const hasProfile = computed(() => profile.value !== null)

  return { ownerId, profile, hasProfile }
}
