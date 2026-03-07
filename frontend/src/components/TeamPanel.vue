<template>
  <div class="team-panel" :class="[`team-${team}`, { 'is-active': isActive }]">
    <!-- Team Banner -->
    <div class="team-banner" :class="`banner-${team}`">
      <v-icon :color="team === 'blue' ? 'info' : 'error'">
        {{ team === 'blue' ? 'mdi-shield-sword' : 'mdi-sword-cross' }}
      </v-icon>
      <span class="team-name">{{ team.toUpperCase() }}</span>
    </div>

    <!-- Ban slots -->
    <div class="section-label">BANS</div>
    <div class="ban-slots">
      <BPSlot
        v-for="i in 3" :key="`ban-${i}`"
        :team="team"
        type="ban"
        :index="i-1"
        :brawler="bans[i-1]?.brawlerObj || null"
        :isCurrent="false"
      />
    </div>

    <!-- Pick slots -->
    <div class="section-label">PICKS</div>
    <div class="pick-slots">
      <BPSlot
        v-for="i in 3" :key="`pick-${i}`"
        :team="team"
        type="pick"
        :index="i-1"
        :brawler="picks[i-1]?.brawlerObj || null"
        :isCurrent="false"
      />
    </div>

    <!-- Player names -->
    <div class="section-label">PLAYERS</div>
    <div class="player-list">
      <div v-for="(p, i) in seats.players" :key="`p-${i}`" class="player-entry">
        <v-icon size="14">mdi-account</v-icon>
        <span>{{ p || `Player ${i+1}` }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import BPSlot from './BPSlot.vue'

defineProps({
  team: { type: String, default: 'blue' },
  seats: { type: Object, default: () => ({ players: [], coaches: [] }) },
  bans: { type: Array, default: () => [] },
  picks: { type: Array, default: () => [] },
  isActive: { type: Boolean, default: false },
})
</script>

<style scoped>
.team-panel {
  background: #1a1a2e;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 8px;
  transition: box-shadow 0.3s;
}
.team-panel.team-blue.is-active { box-shadow: 0 0 20px rgba(90,179,255,0.5); }
.team-panel.team-red.is-active { box-shadow: 0 0 20px rgba(246,110,110,0.5); }
.team-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  font-weight: bold;
  font-size: 1.1rem;
}
.banner-blue { background: rgba(90,179,255,0.15); color: #5ab3ff; }
.banner-red { background: rgba(246,110,110,0.15); color: #f66e6e; }
.team-name { letter-spacing: 2px; }
.section-label {
  font-size: 10px;
  letter-spacing: 1px;
  color: rgba(255,255,255,0.4);
  padding: 0 8px;
}
.ban-slots, .pick-slots {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 0 8px;
  flex-wrap: wrap;
}
.player-list {
  padding: 0 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.player-entry {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgba(255,255,255,0.7);
}
</style>
