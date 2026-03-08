import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/', name: 'Login', component: () => import('@/views/LoginView.vue') },
  { path: '/home', name: 'Home', component: () => import('@/views/HomeView.vue'), meta: { requiresAuth: true } },
  { path: '/room/:id', name: 'Room', component: () => import('@/views/RoomView.vue'), meta: { requiresAuth: true } },
  { path: '/bp/:id', name: 'BP', component: () => import('@/views/BPView.vue'), meta: { requiresAuth: true } },
  { path: '/history', name: 'History', component: () => import('@/views/HistoryView.vue'), meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/')
  } else {
    next()
  }
})

export default router
