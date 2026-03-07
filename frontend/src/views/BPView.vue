<template>
  <div class="bp-root" :class="{ landscape: isLandscape }">
    <!-- Header -->
    <div class="bp-header">
      <span class="bp-title">BP Phase</span>
      <CountdownTimer :seconds="bpState.timer" :isActive="bpState.status === 'active'" @timeout="handleTimeout" />
      <span class="turn-info" v-if="currentTurnInfo">
        Turn {{ bpState.turn + 1 }}/12 — {{ currentTurnInfo.team.toUpperCase() }} {{ currentTurnInfo.type.toUpperCase() }}
      </span>
    </div>

    <!-- Main content -->
    <div class="bp-content">
      <!-- Blue Team Panel -->
      <TeamPanel
        class="team-panel-blue"
        team="blue"
        :seats="roomStore.seats.blue"
        :bans="blueBans"
        :picks="bluePicks"
        :isActive="currentTeam === 'blue'"
      />

      <!-- Center: Brawler Grid -->
      <div class="bp-center">
        <BrawlerGrid
          :brawlers="brawlersStore.brawlers"
          :bannedIds="bannedBrawlerIds"
          :pickedIds="pickedBrawlerIds"
          :prePicks="bpState.prePicks"
          :softLocks="bpState.softLock"
          :coachRecs="bpState.coachRecs"
          :currentUserId="authStore.user?.id"
          @select="handleBrawlerSelect"
        />

        <!-- Soft lock confirmation -->
        <div v-if="mySoftLock" class="soft-lock-bar">
          <span>Soft Locked: {{ getBrawlerName(mySoftLock) }}</span>
          <v-btn color="primary" @click="handleConfirmPick">Confirm Pick</v-btn>
        </div>
      </div>

      <!-- Red Team Panel -->
      <TeamPanel
        class="team-panel-red"
        team="red"
        :seats="roomStore.seats.red"
        :bans="redBans"
        :picks="redPicks"
        :isActive="currentTeam === 'red'"
      />
    </div>

    <!-- Finished overlay -->
    <div v-if="bpState.phase === 'finished'" class="finished-overlay">
      <v-card class="pa-8 text-center">
        <div class="text-h4 mb-4">BP Complete!</div>
        <v-btn color="primary" @click="$router.push('/home')">Back to Home</v-btn>
      </v-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRoomStore } from '@/stores/room'
import { useBrawlersStore } from '@/stores/brawlers'
import TeamPanel from '@/components/TeamPanel.vue'
import BrawlerGrid from '@/components/BrawlerGrid.vue'
import CountdownTimer from '@/components/CountdownTimer.vue'

const route = useRoute()
const authStore = useAuthStore()
const roomStore = useRoomStore()
const brawlersStore = useBrawlersStore()

const bpState = computed(() => roomStore.bpState)
const currentTurnInfo = computed(() => roomStore.currentTurnInfo)
const currentTeam = computed(() => roomStore.currentTeam)
const bannedBrawlerIds = computed(() => roomStore.bannedBrawlerIds)
const pickedBrawlerIds = computed(() => roomStore.pickedBrawlerIds)

const isLandscape = ref(window.innerWidth > window.innerHeight)

const blueBans = computed(() => bpState.value.bans.filter(b => b.team === 'blue'))
const redBans = computed(() => bpState.value.bans.filter(b => b.team === 'red'))
const bluePicks = computed(() => bpState.value.picks.filter(p => p.team === 'blue'))
const redPicks = computed(() => bpState.value.picks.filter(p => p.team === 'red'))

const myUserId = computed(() => authStore.user?.id)
const mySoftLock = computed(() => bpState.value.softLock[myUserId.value] || null)

function getBrawlerName(brawlerId) {
  const b = brawlersStore.getBrawlerById.value(brawlerId)
  return b ? b.name_en : brawlerId
}

function getMyTeam() {
  const uid = myUserId.value
  if (!uid) return null
  const blueSeats = roomStore.seats.blue
  const redSeats = roomStore.seats.red
  if (blueSeats.players.includes(uid) || blueSeats.coaches.includes(uid)) return 'blue'
  if (redSeats.players.includes(uid) || redSeats.coaches.includes(uid)) return 'red'
  return null
}

function isMyTurnToAct() {
  const myTeam = getMyTeam()
  return currentTeam.value === myTeam
}

function handleBrawlerSelect(brawler) {
  if (!isMyTurnToAct()) return
  const uid = myUserId.value
  if (bpState.value.phase === 'ban') {
    roomStore.setPrePick(uid, brawler.bid)
  } else {
    roomStore.setSoftLock(uid, brawler.bid)
  }
}

function handleConfirmPick() {
  const uid = myUserId.value
  const brawlerId = mySoftLock.value
  if (brawlerId) roomStore.confirmPick(uid, brawlerId)
}

function handleTimeout() {
  if (isMyTurnToAct() && roomStore.availableBrawlers.length > 0) {
    const random = roomStore.availableBrawlers[Math.floor(Math.random() * roomStore.availableBrawlers.length)]
    roomStore.advanceTurn(random.bid)
  }
}

function onResize() {
  isLandscape.value = window.innerWidth > window.innerHeight
}

onMounted(async () => {
  window.addEventListener('resize', onResize)
  await brawlersStore.loadBrawlers()
  await roomStore.subscribeRoom(route.params.id)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  roomStore.unsubscribe()
})
</script>

<style scoped>
.bp-root {
  background: #0f0f1a;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.bp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #1a1a2e;
  border-bottom: 1px solid rgba(76,175,80,0.3);
}
.bp-title {
  font-size: 1.4rem;
  font-weight: bold;
  color: #4CAF50;
}
.turn-info {
  font-size: 1rem;
  color: #fff;
}
.bp-content {
  display: flex;
  flex: 1;
  gap: 8px;
  padding: 8px;
}
.team-panel-blue, .team-panel-red {
  width: 220px;
  flex-shrink: 0;
}
.bp-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.soft-lock-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 8px;
  background: rgba(76,175,80,0.15);
  border: 1px solid #4CAF50;
  border-radius: 8px;
}
.finished-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
@media (orientation: portrait) {
  .bp-content {
    flex-direction: column;
  }
  .team-panel-blue, .team-panel-red {
    width: 100%;
  }
}
</style>
