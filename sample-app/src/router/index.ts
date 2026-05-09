import { createWebHistory, createRouter } from 'vue-router'
import EditItem from '../components/EditItem.vue'
import EditRoom from '../components/EditRoom.vue'
import JoinRoom from '../components/JoinRoom.vue'
import LoanItem from '../components/LoanItem.vue'
import RoomSettings from '../components/RoomSettings.vue'
import AddRoom from '../views/AddRoom.vue'
import Home from '../views/Home.vue'
import ProfileSetup from '../views/ProfileSetup.vue'
import RoomDetail from '../views/RoomDetail.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/profile', name: 'profile', component: ProfileSetup },
    { path: '/rooms/add', name: 'room-add', component: AddRoom },
    { path: '/rooms/new', name: 'room-create', component: EditRoom },
    { path: '/rooms/join', name: 'room-join', component: JoinRoom },
    { path: '/rooms/:id', name: 'room-detail', component: RoomDetail },
    {
      path: '/rooms/:id/settings',
      name: 'room-settings',
      component: RoomSettings,
    },
    {
      path: '/rooms/:roomId/items/new',
      name: 'item-create',
      component: EditItem,
    },
    {
      path: '/rooms/:roomId/items/:itemId/edit',
      name: 'item-edit',
      component: EditItem,
    },
    {
      path: '/rooms/:roomId/items/:itemId/loan',
      name: 'item-loan',
      component: LoanItem,
    },
  ],
})

export default router
