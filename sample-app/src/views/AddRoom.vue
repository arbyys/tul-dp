<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import iconBackBlack from '../assets/icon-back-black.svg'
import iconBackWhite from '../assets/icon-back-white.svg'
import EditRoom from '../components/EditRoom.vue'
import JoinRoom from '../components/JoinRoom.vue'
import { useIconTheme, useThemedIconVariant } from '../composables/useIconTheme'

type AddRoomTab = 'join' | 'create'

const router = useRouter()
const { useBlackIcons } = useIconTheme()
const iconBack = useThemedIconVariant(useBlackIcons, iconBackBlack, iconBackWhite)
const activeTab = ref<AddRoomTab>('join')

function goBack(): void {
  router.push('/')
}

function selectTab(tab: AddRoomTab): void {
  activeTab.value = tab
}
</script>

<template>
  <div class="p-6 flex flex-col gap-6">
    <div class="flex flex-row items-center gap-3">
      <div
        class="flex w-8 h-8 rounded-full bg-secondary border border-border items-center justify-center cursor-pointer"
        @click="goBack"
      >
        <img :src="iconBack" class="w-4 h-4" alt="" />
      </div>
      <span class="text-2xl font-bold text-card-foreground">Přidat místnost</span>
    </div>

    <div class="flex flex-row gap-1 bg-secondary rounded-lg p-1">
      <div
        :class="[
          'flex flex-1 rounded-md py-2.5 items-center justify-center cursor-pointer',
          activeTab === 'join' ? 'bg-card' : 'bg-transparent',
        ]"
        @click="selectTab('join')"
      >
        <span
          :class="[
            'text-sm font-medium',
            activeTab === 'join' ? 'text-card-foreground' : 'text-muted-foreground',
          ]"
        >
          Připojit se
        </span>
      </div>
      <div
        :class="[
          'flex flex-1 rounded-md py-2.5 items-center justify-center cursor-pointer',
          activeTab === 'create' ? 'bg-card' : 'bg-transparent',
        ]"
        @click="selectTab('create')"
      >
        <span
          :class="[
            'text-sm font-medium',
            activeTab === 'create' ? 'text-card-foreground' : 'text-muted-foreground',
          ]"
        >
          Vytvořit novou
        </span>
      </div>
    </div>

    <div class="bg-card rounded-lg p-4 border border-border">
      <JoinRoom v-if="activeTab === 'join'" :embedded="true" />
      <EditRoom v-else :embedded="true" />
    </div>
  </div>
</template>
