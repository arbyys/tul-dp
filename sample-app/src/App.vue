<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core'
import { NonEmptyString100, sqliteTrue } from '@evolu/common'
import { computed, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import iconCogwheelBlack from './assets/icon-cogwheel-black.svg'
import iconCogwheelWhite from './assets/icon-cogwheel-white.svg'
import iconDarkmodeBlack from './assets/icon-darkmode-black.svg'
import iconDarkmodeWhite from './assets/icon-darkmode-white.svg'
import iconLightmodeBlack from './assets/icon-lightmode-black.svg'
import iconLightmodeWhite from './assets/icon-lightmode-white.svg'
import { provideEvolu } from '@evolu/vue'
import UserProfile from './components/UserProfile.vue'
import { useProfileSync } from './composables/useProfileSync'
import { useThemedIconVariant, type ThemeName, isThemeName } from './composables/useIconTheme'
import { evolu, createQuery, useQuery } from './db/evolu'
import './App.css'

provideEvolu(evolu)

const router = useRouter()

const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'theme-dark',
  valueLight: 'theme-light',
  initialValue: 'dark',
})
const toggleDark = useToggle(isDark)
const currentTheme = computed<ThemeName>({
  get: () => (isDark.value ? 'dark' : 'light'),
  set: (value) => {
    isDark.value = value === 'dark'
  },
})
const themeClass = computed(() => `theme-${currentTheme.value}`)
const useBlackIcons = computed(() => currentTheme.value === 'light')
const iconCogwheel = useThemedIconVariant(useBlackIcons, iconCogwheelBlack, iconCogwheelWhite)
const iconThemeToggle = computed(() => {
  if (currentTheme.value === 'light') {
    return useBlackIcons.value ? iconLightmodeBlack : iconLightmodeWhite
  }

  return useBlackIcons.value ? iconDarkmodeBlack : iconDarkmodeWhite
})

const profileThemeQuery = createQuery((db) =>
  db
    .selectFrom('profile')
    .select(['id', 'theme'])
    .where('isDeleted', 'is not', sqliteTrue)
    .orderBy('createdAt', 'desc')
    .limit(1),
)

const profileThemeRows = useQuery(profileThemeQuery)

function persistThemeToProfile(theme: ThemeName): void {
  if (profileThemeRows.value.length === 0) return

  const row = profileThemeRows.value[0]
  if (!row || row.theme === theme) return

  evolu.update('profile', {
    id: row.id,
    theme: NonEmptyString100.orThrow(theme),
  })
}

watch(
  profileThemeRows,
  (rows) => {
    const row = rows[0]
    if (!row) return

    const themeValue = row.theme
    if (isThemeName(themeValue) && currentTheme.value !== themeValue) {
      currentTheme.value = themeValue
      return
    }

    if (!isThemeName(themeValue)) {
      persistThemeToProfile(currentTheme.value)
    }
  },
  { immediate: true, deep: true },
)

function toggleTheme(): void {
  toggleDark()
  persistThemeToProfile(currentTheme.value)
}

function goHome(): void {
  router.push('/')
}

function goProfile(): void {
  router.push('/profile')
}

useProfileSync()
</script>

<template>
  <div class="font-sans min-h-screen bg-background" :class="themeClass">
    <div class="flex flex-col min-h-full items-center">
      <div
        class="w-full max-w-lg bg-card/60 border-b border-border px-4 py-3 flex flex-row items-center justify-between"
      >
        <div class="flex flex-row items-center gap-2">
          <div class="flex items-center gap-2 cursor-pointer" @click="goHome">
            <span class="text-lg font-bold text-card-foreground cursor-pointer">Výpůjčky</span>
          </div>
          <UserProfile />
        </div>
        <div class="flex flex-row gap-2 items-center">
          <div
            class="flex rounded-md px-2 py-1 items-center justify-center bg-secondary border border-border cursor-pointer"
            @click="goProfile"
            title="Nastavení"
          >
            <img :src="iconCogwheel" class="w-3.5 h-3.5" alt="" />
          </div>
          <div
            class="flex rounded-md px-2 py-1 items-center justify-center bg-secondary border border-border cursor-pointer"
            @click="toggleTheme"
            title="Barevný motiv"
          >
            <img :src="iconThemeToggle" class="w-3.5 h-3.5" alt="" />
          </div>
        </div>
      </div>

      <div class="w-full max-w-lg pt-4">
        <RouterView />
      </div>
    </div>
  </div>
</template>
