import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import pb from '@/services/pb'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isLoggedIn = computed(() => !!user.value)

  async function login(username, password) {
    try {
      const authData = await pb.collection('users').authWithPassword(username, password)
      user.value = authData.record
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }

  function logout() {
    pb.authStore.clear()
    user.value = null
  }

  function restoreSession() {
    if (pb.authStore.isValid) {
      user.value = pb.authStore.model
    }
  }

  return { user, isLoggedIn, login, logout, restoreSession }
})
