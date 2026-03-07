<template>
  <v-container fluid style="background: #0f0f1a; min-height: 100vh; padding: 0;">
    <v-app-bar color="surface" elevation="2">
      <v-btn icon @click="$router.push('/home')"><v-icon>mdi-arrow-left</v-icon></v-btn>
      <v-app-bar-title>Room {{ roomStore.id }}</v-app-bar-title>
      <template #append>
        <v-chip color="primary" class="mr-3">BO{{ roomStore.config.bo }}</v-chip>
        <v-chip :color="roomStore.config.firstPick === 'blue' ? 'info' : 'error'" class="mr-3">
          First Pick: {{ roomStore.config.firstPick }}
        </v-chip>
      </template>
    </v-app-bar>

    <v-main style="padding-top: 64px;">
      <v-container class="py-6">
        <v-row>
          <!-- Invite Links -->
          <v-col cols="12">
            <v-card style="background: #1a1a2e;" class="pa-4 mb-4">
              <v-card-title>Invite Players</v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="6">
                    <v-btn color="info" block @click="copyInvite('blue')">
                      <v-icon start>mdi-content-copy</v-icon>
                      Copy Blue Team Invite
                    </v-btn>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-btn color="error" block @click="copyInvite('red')">
                      <v-icon start>mdi-content-copy</v-icon>
                      Copy Red Team Invite
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Seat Manager -->
          <v-col cols="12">
            <SeatManager :seats="roomStore.seats" :users="allUsers" @update:seats="handleSeatsUpdate" />
          </v-col>

          <!-- Map Selector -->
          <v-col cols="12">
            <MapSelector v-model="selectedMapId" :maps="maps" />
          </v-col>
        </v-row>

        <!-- Start BP Button (host only) -->
        <v-row v-if="isHost" class="mt-4">
          <v-col cols="12" class="text-center">
            <v-btn color="primary" size="x-large" @click="handleStartBP" :loading="startingBP">
              <v-icon start>mdi-sword-cross</v-icon>
              Start BP
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <v-snackbar v-model="snack.show" :color="snack.color" timeout="3000">{{ snack.text }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRoomStore } from '@/stores/room'
import SeatManager from '@/components/SeatManager.vue'
import MapSelector from '@/components/MapSelector.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const roomStore = useRoomStore()

const selectedMapId = ref(null)
const startingBP = ref(false)
const allUsers = ref([])
const maps = ref([])
const snack = reactive({ show: false, text: '', color: 'success' })

const isHost = computed(() => authStore.user?.id === roomStore.hostId)

function showSnack(text, color = 'success') {
  snack.text = text; snack.color = color; snack.show = true
}

async function copyInvite(team) {
  const url = `${window.location.origin}/room/${roomStore.id}?team=${team}&code=${roomStore.id}`
  await navigator.clipboard.writeText(url)
  showSnack(`${team.toUpperCase()} team invite copied!`)
}

function handleSeatsUpdate(newSeats) {
  roomStore.seats = newSeats
}

async function handleStartBP() {
  startingBP.value = true
  try {
    await roomStore.startBP()
    router.push(`/bp/${roomStore.id}`)
  } catch (e) {
    showSnack('Failed to start BP: ' + e.message, 'error')
  } finally {
    startingBP.value = false
  }
}

onMounted(async () => {
  const roomId = route.params.id
  if (roomId) {
    await roomStore.subscribeRoom(roomId)
  }
})

onUnmounted(() => {
  roomStore.unsubscribe()
})
</script>
