<script setup lang="ts">
import { sqliteTrue } from '@evolu/common'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import iconBackBlack from '../assets/icon-back-black.svg'
import iconBackWhite from '../assets/icon-back-white.svg'
import MnemonicShare from '../components/MnemonicShare.vue'
import { useIconTheme, useThemedIconVariant } from '../composables/useIconTheme'
import { createQuery, useQuery } from '../db/evolu'
import { routeParamToString } from '../utils/routeParam'

const route = useRoute()
const router = useRouter()
const { useBlackIcons } = useIconTheme()
const iconBack = useThemedIconVariant(useBlackIcons, iconBackBlack, iconBackWhite)
const roomId = computed(() => routeParamToString(route.params.id) ?? '')

const connQuery = createQuery((db) =>
  db.selectFrom('connectedRoom').selectAll().where('isDeleted', 'is not', sqliteTrue),
)
const rooms = useQuery(connQuery)
const currentRoom = computed(() => rooms.value.find((r) => r.id === roomId.value))
const mnemonicText = computed(() => {
  const value = currentRoom.value?.roomMnemonic?.trim()
  return value && value.length > 0 ? value : null
})

function goBack(): void {
  router.push(roomId.value ? `/rooms/${roomId.value}` : '/')
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
        <span class="text-2xl font-bold text-card-foreground">
          Sdílet místnost {{ currentRoom?.roomName }}
        </span>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <MnemonicShare :mnemonic="mnemonicText" />
    </div>
  </div>
</template>
