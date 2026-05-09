import { sqliteTrue } from '@evolu/common'
import { computed, type Ref } from 'vue'
import { createQuery, useQuery } from '../db/evolu'

export type ThemeName = 'dark' | 'light'

export function isThemeName(value: unknown): value is ThemeName {
  return value === 'dark' || value === 'light'
}

export function useIconTheme(): {
  useBlackIcons: Readonly<Ref<boolean>>
} {
  const profileThemeQuery = createQuery((db) =>
    db
      .selectFrom('profile')
      .select(['theme'])
      .where('isDeleted', 'is not', sqliteTrue)
      .orderBy('createdAt', 'desc')
      .limit(1),
  )

  const profileThemeRows = useQuery(profileThemeQuery)

  const currentTheme = computed<ThemeName>(() => {
    const value = profileThemeRows.value[0]?.theme
    return isThemeName(value) ? value : 'dark'
  })

  const useBlackIcons = computed(() => currentTheme.value === 'light')

  return { useBlackIcons }
}

export function useThemedIconVariant<T>(
  useBlackIcons: Readonly<Ref<boolean>>,
  blackIcon: T,
  whiteIcon: T,
): Readonly<Ref<T>> {
  return computed(() => (useBlackIcons.value ? blackIcon : whiteIcon))
}
