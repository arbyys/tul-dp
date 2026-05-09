<script setup lang="ts">
import { NonEmptyString100, sqliteTrue } from '@evolu/common'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import iconBackBlack from '../assets/icon-back-black.svg'
import iconBackWhite from '../assets/icon-back-white.svg'
import iconWarning from '../assets/icon-warning.svg'
import MnemonicReceive from '../components/MnemonicReceive.vue'
import MnemonicShare from '../components/MnemonicShare.vue'
import { useAutoError } from '../composables/useAutoError'
import { useIconTheme, useThemedIconVariant } from '../composables/useIconTheme'
import {
  evolu,
  createQuery,
  importAppOwnerMnemonic,
  resetAppOwnerData,
  useQuery,
} from '../db/evolu'

const router = useRouter()
const { useBlackIcons } = useIconTheme()
const iconBack = useThemedIconVariant(useBlackIcons, iconBackBlack, iconBackWhite)

const name = ref('')
const email = ref('')
const error = useAutoError()
const saving = ref(false)
const showResetDialog = ref(false)
const showShareModal = ref(false)
const showReceiveModal = ref(false)

const profileQuery = createQuery((db) =>
  db
    .selectFrom('profile')
    .select(['id', 'displayName', 'email'])
    .where('isDeleted', 'is not', sqliteTrue)
    .orderBy('createdAt', 'desc')
    .limit(1),
)

const profileRows = useQuery(profileQuery)
const existingProfile = computed(() => profileRows.value[0] ?? null)
const profileMnemonicText = computed(() => {
  const mnemonic = evolu?.appOwner?.mnemonic
  return mnemonic && mnemonic.length > 0 ? mnemonic : null
})

function goBack(): void {
  router.push('/')
}

watch(
  existingProfile,
  (profileRow) => {
    if (!profileRow) return
    if (name.value.trim().length === 0) {
      name.value = profileRow.displayName ?? ''
    }
    if (email.value.trim().length === 0) {
      email.value = profileRow.email ?? ''
    }
  },
  { immediate: true },
)

function handleSave(): void {
  const trimmedName = name.value.trim()
  if (trimmedName.length === 0) {
    error.value = 'Jméno nesmí být prázdné'
    return
  }
  if (trimmedName.length > 100) {
    error.value = 'Jméno je příliš dlouhé (max 100 znaků)'
    return
  }

  const trimmedEmail = email.value.trim() || null
  if (!trimmedEmail) {
    error.value = 'Email je povinný'
    return
  }
  if (trimmedEmail.length > 100) {
    error.value = 'Email je příliš dlouhý (max 100 znaků)'
    return
  }

  saving.value = true
  error.value = ''

  const displayName = NonEmptyString100.orThrow(trimmedName)
  const emailValue = NonEmptyString100.orThrow(trimmedEmail)

  if (existingProfile.value) {
    evolu.update('profile', {
      id: existingProfile.value.id,
      displayName,
      email: emailValue,
    })
  } else {
    evolu.insert('profile', {
      displayName,
      email: emailValue,
    })
  }

  router.push('/')
}

function onMnemonicReceived(mnemonic: string): void {
  importAppOwnerMnemonic(mnemonic)
}

function openResetDialog(): void {
  showResetDialog.value = true
}

function closeResetDialog(): void {
  showResetDialog.value = false
}

function confirmResetData(): void {
  showResetDialog.value = false
  resetAppOwnerData()
}
</script>

<template>
  <div class="p-6 flex flex-col gap-6">
    <div class="flex flex-col gap-2">
      <div class="flex flex-row items-center gap-3">
        <div
          class="flex w-8 h-8 rounded-full bg-secondary border border-border items-center justify-center cursor-pointer"
          @click="goBack"
        >
          <img :src="iconBack" class="w-4 h-4" alt="" />
        </div>
        <span class="text-2xl font-bold text-card-foreground">Nastavení</span>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium text-card-foreground">Jméno *</span>
        <input
          class="bg-secondary text-secondary-foreground rounded-lg px-4 py-3 text-base"
          placeholder="Vaše jméno"
          v-model="name"
        />
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium text-card-foreground">Email *</span>
        <input
          class="bg-secondary text-secondary-foreground rounded-lg px-4 py-3 text-base"
          placeholder="vas@email.cz"
          v-model="email"
        />
      </div>

      <div
        class="flex bg-primary rounded-lg py-3 items-center justify-center cursor-pointer"
        :class="saving ? 'opacity-50' : ''"
        @click="handleSave"
      >
        <span class="text-base font-medium text-primary-foreground">
          {{ saving ? 'Ukládám...' : 'Uložit' }}
        </span>
      </div>
    </div>

    <div v-if="error" class="bg-destructive/10 rounded-lg p-3">
      <span class="text-sm text-destructive">{{ error }}</span>
    </div>

    <div class="mt-8">
      <div class="text-sm font-medium text-card-foreground mb-3">Synchronizace profilu</div>
      <div class="flex flex-row gap-3">
        <div
          class="flex flex-1 bg-secondary rounded-lg py-3 items-center justify-center border border-border cursor-pointer"
          @click="showShareModal = true"
        >
          <span class="text-sm font-medium text-secondary-foreground">Sdílet profil</span>
        </div>
        <div
          class="flex flex-1 bg-secondary rounded-lg py-3 items-center justify-center border border-border cursor-pointer"
          @click="showReceiveModal = true"
        >
          <span class="text-sm font-medium text-secondary-foreground">Načíst profil</span>
        </div>
      </div>

      <div
        class="mt-3 flex bg-destructive rounded-lg py-3 items-center justify-center cursor-pointer"
        @click="openResetDialog"
      >
        <span class="text-base font-medium text-destructive-foreground">Resetovat data</span>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showShareModal" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/70" @click="showShareModal = false" />
        <div
          class="absolute inset-0 flex items-end justify-center px-4 pb-6"
          @click.self="showShareModal = false"
        >
          <div
            class="w-full max-w-lg bg-card rounded-xl p-4 border border-border flex flex-col gap-4"
          >
            <div class="flex flex-row items-center justify-between">
              <span class="text-base font-semibold text-card-foreground">Sdílet profil</span>
              <div
                class="flex w-8 h-8 rounded-md bg-secondary border border-border items-center justify-center cursor-pointer"
                @click="showShareModal = false"
              >
                <span class="text-sm font-semibold text-secondary-foreground">✕</span>
              </div>
            </div>
            <MnemonicShare :mnemonic="profileMnemonicText" />
          </div>
        </div>
      </div>

      <div v-if="showReceiveModal" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/70" @click="showReceiveModal = false" />
        <div
          class="absolute inset-0 flex items-end justify-center px-4 pb-6"
          @click.self="showReceiveModal = false"
        >
          <div
            class="w-full max-w-lg bg-card rounded-xl p-4 border border-border flex flex-col gap-4"
          >
            <div class="flex flex-row items-center justify-between">
              <span class="text-base font-semibold text-card-foreground">Načíst profil</span>
              <div
                class="flex w-8 h-8 rounded-md bg-secondary border border-border items-center justify-center cursor-pointer"
                @click="showReceiveModal = false"
              >
                <span class="text-sm font-semibold text-secondary-foreground">✕</span>
              </div>
            </div>
            <div
              class="bg-destructive/10 rounded-lg p-3 border border-destructive/20 flex flex-row items-center gap-2"
            >
              <img :src="iconWarning" class="w-5 h-5 shrink-0 mt-0.5" alt="" />
              <span class="text-xs text-destructive">
                Načtením přepíšete aktuální identitu a aplikace se restartuje.
              </span>
            </div>
            <MnemonicReceive @received="onMnemonicReceived" />
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showResetDialog" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/70" @click="closeResetDialog" />

        <div
          class="absolute inset-0 flex items-center justify-center px-4"
          @click.self="closeResetDialog"
        >
          <div
            class="w-full max-w-lg bg-card rounded-lg p-4 border border-border flex flex-col gap-2"
          >
            <span class="text-base font-medium text-card-foreground">
              Opravdu chcete resetovat všechna data?
            </span>
            <span class="text-sm text-muted-foreground">
              Aplikace vygeneruje nového vlastníka a smaže lokální data stávajícího vlastníka.
            </span>

            <div class="flex flex-row gap-3 mt-4">
              <div
                class="flex flex-1 bg-destructive rounded-lg py-2 items-center justify-center cursor-pointer"
                @click="confirmResetData"
              >
                <span class="text-sm font-medium text-destructive-foreground">Resetovat data</span>
              </div>

              <div
                class="flex flex-1 bg-secondary rounded-lg py-2 items-center justify-center border border-border cursor-pointer"
                @click="closeResetDialog"
              >
                <span class="text-sm font-medium text-secondary-foreground">Zrušit</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
