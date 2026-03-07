<template>
  <v-container class="fill-height" style="background: #0f0f1a; min-height: 100vh;" fluid>
    <v-app-bar color="surface" elevation="2">
      <v-app-bar-title>
        <span style="color: #4CAF50; font-weight: bold;">荒野乱斗 BP System</span>
      </v-app-bar-title>
      <template #append>
        <span class="mr-3 text-grey-lighten-1">{{ authStore.user?.username }}</span>
        <v-btn icon @click="handleLogout">
          <v-icon>mdi-logout</v-icon>
        </v-btn>
      </template>
    </v-app-bar>

    <v-main style="padding-top: 64px;">
      <v-container class="py-8">
        <v-row class="mb-6">
          <v-col cols="12" md="6">
            <v-card style="background: #1a1a2e; border: 1px solid rgba(76,175,80,0.3);" class="pa-4">
              <v-card-title>Create Room</v-card-title>
              <v-card-text>
                <v-select v-model="newRoomConfig.bo" label="Best Of" :items="[1,3,5]" variant="outlined" color="primary" class="mb-3" />
                <v-switch v-model="newRoomConfig.globalBP" label="Global BP (shared ban list)" color="primary" class="mb-3" />
                <v-select v-model="newRoomConfig.firstPick" label="First Pick" :items="['blue','red']" variant="outlined" color="primary" />
              </v-card-text>
              <v-card-actions>
                <v-btn color="primary" @click="handleCreateRoom" :loading="creatingRoom" block>
                  <v-icon start>mdi-plus-circle</v-icon>
                  Create Room
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card style="background: #1a1a2e; border: 1px solid rgba(90,179,255,0.3);" class="pa-4">
              <v-card-title>Join Room</v-card-title>
              <v-card-text>
                <v-text-field
                  v-model="inviteCode"
                  label="Invite Code"
                  variant="outlined"
                  color="info"
                  placeholder="e.g. ABC123"
                />
              </v-card-text>
              <v-card-actions>
                <v-btn color="info" @click="handleJoinRoom" :loading="joiningRoom" block :disabled="!inviteCode">
                  <v-icon start>mdi-login</v-icon>
                  Join Room
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <v-row>
          <v-col>
            <v-btn color="secondary" variant="text" @click="$router.push('/history')">
              <v-icon start>mdi-history</v-icon>
              Match History
            </v-btn>
          </v-col>
        </v-row>

        <v-snackbar v-model="snack.show" :color="snack.color" timeout="3000">{{ snack.text }}</v-snackbar>
      </v-container>
    </v-main>
  </v-container>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRoomStore } from '@/stores/room'

const router = useRouter()
const authStore = useAuthStore()
const roomStore = useRoomStore()

const newRoomConfig = reactive({ bo: 3, globalBP: true, firstPick: 'blue' })
const inviteCode = ref('')
const creatingRoom = ref(false)
const joiningRoom = ref(false)
const snack = reactive({ show: false, text: '', color: 'success' })

function showSnack(text, color = 'success') {
  snack.text = text
  snack.color = color
  snack.show = true
}

async function handleCreateRoom() {
  creatingRoom.value = true
  try {
    const room = await roomStore.createRoom({ ...newRoomConfig })
    router.push(`/room/${room.id}`)
  } catch (e) {
    showSnack('Failed to create room: ' + e.message, 'error')
  } finally {
    creatingRoom.value = false
  }
}

async function handleJoinRoom() {
  joiningRoom.value = true
  try {
    const room = await roomStore.joinRoom(inviteCode.value.trim().toUpperCase())
    router.push(`/room/${room.id}`)
  } catch (e) {
    showSnack('Failed to join room: ' + e.message, 'error')
  } finally {
    joiningRoom.value = false
  }
}

function handleLogout() {
  authStore.logout()
  router.push('/')
}
</script>
