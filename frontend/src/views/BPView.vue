<template>
  <div class="bp-root" :class="{ landscape: isLandscape }">
    <!-- Header -->
    <div class="bp-header">
      <span class="bp-title">
        {{ bpState.phase === 'ban' ? '禁用阶段' : bpState.phase === 'pick' ? '选取阶段' : 'BP' }}
      </span>

      <CountdownTimer :seconds="bpState.timer" :isActive="bpState.status === 'active'" @timeout="handleTimeout" />

      <!-- Ban phase status -->
      <div v-if="bpState.phase === 'ban'" class="ban-phase-status">
        <span class="team-blue">🔵 {{ bpState.simultBans?.blue?.length ?? 0 }}/{{ roomStore.BANS_PER_TEAM }}</span>
        <span class="vs-sep">·</span>
        <span class="team-red">🔴 {{ bpState.simultBans?.red?.length ?? 0 }}/{{ roomStore.BANS_PER_TEAM }}</span>
        <span class="ban-hint">双方同时禁用</span>
      </div>

      <!-- Pick phase turn info -->
      <span v-else-if="currentTurnInfo" class="turn-info">
        Turn {{ bpState.turn + 1 }}/6 — {{ currentTurnInfo.team.toUpperCase() }} PICK
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
        :isActive="bpState.phase === 'pick' && currentTeam === 'blue'"
        :bansRevealed="bpState.simultBans?.revealed ?? false"
        :bansPerTeam="roomStore.BANS_PER_TEAM"
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

        <!-- Ban phase confirm bar -->
        <div v-if="bpState.phase === 'ban' && myPreBan && !myTeamBanFull" class="confirm-bar confirm-ban-bar">
          <span class="confirm-label">
            <v-icon color="error" size="16">mdi-cancel</v-icon>
            禁用: {{ getBrawlerName(myPreBan) }}
          </span>
          <v-btn color="error" size="small" @click="handleConfirmBan">确认禁用</v-btn>
        </div>

        <!-- Pick phase soft-lock confirm bar -->
        <div v-if="bpState.phase === 'pick' && mySoftLock" class="confirm-bar confirm-pick-bar">
          <span class="confirm-label">已选: {{ getBrawlerName(mySoftLock) }}</span>
          <v-btn color="primary" size="small" @click="handleConfirmPick">确认选择</v-btn>
        </div>
      </div>

      <!-- Red Team Panel -->
      <TeamPanel
        class="team-panel-red"
        team="red"
        :seats="roomStore.seats.red"
        :bans="redBans"
        :picks="redPicks"
        :isActive="bpState.phase === 'pick' && currentTeam === 'red'"
        :bansRevealed="bpState.simultBans?.revealed ?? false"
        :bansPerTeam="roomStore.BANS_PER_TEAM"
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

// ── Team identification ───────────────────────────────────────────────────

const myUserId = computed(() => authStore.user?.id)

const myTeam = computed(() => roomStore.getUserTeam(myUserId.value))

// ── Ban phase state ───────────────────────────────────────────────────────

/** The brawler the current user has pre-selected for banning */
const myPreBan = computed(() =>
  bpState.value.phase === 'ban' ? (bpState.value.prePicks[myUserId.value] || null) : null
)

/** True when own team has already confirmed all bans */
const myTeamBanFull = computed(() => {
  if (!myTeam.value) return true
  const teamBans = bpState.value.simultBans?.[myTeam.value] ?? []
  return teamBans.length >= roomStore.BANS_PER_TEAM
})

/**
 * Returns ban display objects for a team, perspective-aware.
 * During ban phase: own team sees actual brawlers; opponent sees masked slots.
 * After reveal: all actual brawlers shown.
 */
function getBansForTeam(team) {
  if (bpState.value.phase === 'ban') {
    return roomStore.getBansForViewer(team, myTeam.value)
  }
  // Pick phase or finished: bans are in bpState.bans (populated after reveal)
  const brawlersStore = useBrawlersStore()
  return bpState.value.bans
    .filter(b => b.team === team)
    .map(b => ({ brawlerId: b.brawlerId, brawlerObj: brawlersStore.getBrawlerById(b.brawlerId), masked: false }))
}

const blueBans = computed(() => getBansForTeam('blue'))
const redBans = computed(() => getBansForTeam('red'))

// ── Pick phase state ──────────────────────────────────────────────────────

const bluePicks = computed(() =>
  bpState.value.picks
    .filter(p => p.team === 'blue')
    .map(p => ({ ...p, brawlerObj: brawlersStore.getBrawlerById(p.brawlerId) }))
)
const redPicks = computed(() =>
  bpState.value.picks
    .filter(p => p.team === 'red')
    .map(p => ({ ...p, brawlerObj: brawlersStore.getBrawlerById(p.brawlerId) }))
)

const mySoftLock = computed(() =>
  bpState.value.phase === 'pick' ? (bpState.value.softLock[myUserId.value] || null) : null
)

// ── Helpers ───────────────────────────────────────────────────────────────

function getBrawlerName(brawlerId) {
  const b = brawlersStore.getBrawlerById(brawlerId)
  return b ? (b.name_cn !== b.name_en ? `${b.name_cn} / ${b.name_en}` : b.name_en) : brawlerId
}

function isMyTurnToPick() {
  return currentTeam.value === myTeam.value
}

// ── Interaction handlers ──────────────────────────────────────────────────

/**
 * Click on a brawler in the grid.
 * - Ban phase: any player can pre-select (no turn restriction).
 * - Pick phase: only the active team's player.
 */
function handleBrawlerSelect(brawler) {
  const uid = myUserId.value
  if (!uid) return

  if (bpState.value.phase === 'ban') {
    // Anyone on either team can pre-select a ban target
    if (!myTeamBanFull.value) {
      roomStore.setPrePick(uid, brawler.bid)
    }
  } else if (bpState.value.phase === 'pick') {
    if (isMyTurnToPick()) {
      roomStore.setSoftLock(uid, brawler.bid)
    }
  }
}

function handleConfirmBan() {
  const uid = myUserId.value
  const brawlerId = myPreBan.value
  if (brawlerId) roomStore.confirmBan(uid, brawlerId)
}

function handleConfirmPick() {
  const uid = myUserId.value
  const brawlerId = mySoftLock.value
  if (brawlerId) roomStore.confirmPick(uid, brawlerId)
}

function handleTimeout() {
  if (bpState.value.phase === 'ban') {
    // Auto-confirm ban for own team if still slots remaining
    if (!myTeamBanFull.value) {
      const uid = myUserId.value
      const preBan = myPreBan.value
      if (preBan) {
        roomStore.confirmBan(uid, preBan)
      } else {
        // availableBrawlers already excludes all confirmed bans (both teams)
        const candidate = roomStore.availableBrawlers[0]
        if (candidate) roomStore.confirmBan(uid, candidate.bid)
      }
    }
    // Force-reveal regardless (so the game doesn't hang if opponent didn't ban in time)
    roomStore.revealBans()
  } else if (bpState.value.phase === 'pick') {
    if (isMyTurnToPick()) {
      const brawlerId = mySoftLock.value ?? roomStore.availableBrawlers[0]?.bid
      if (brawlerId) roomStore.advanceTurn(brawlerId)
    }
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
  flex-wrap: wrap;
  gap: 8px;
}
.bp-title {
  font-size: 1.4rem;
  font-weight: bold;
  color: #4CAF50;
}
.ban-phase-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
}
.team-blue { color: #5ab3ff; font-weight: bold; }
.team-red  { color: #f66e6e; font-weight: bold; }
.vs-sep { color: rgba(255,255,255,0.3); }
.ban-hint {
  color: rgba(255,255,255,0.4);
  font-size: 0.8rem;
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
.confirm-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 8px 16px;
  border-radius: 8px;
  flex-shrink: 0;
}
.confirm-ban-bar {
  background: rgba(246,110,110,0.12);
  border: 1px solid rgba(246,110,110,0.5);
}
.confirm-pick-bar {
  background: rgba(76,175,80,0.15);
  border: 1px solid #4CAF50;
}
.confirm-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fff;
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
