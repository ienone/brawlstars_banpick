<template>
  <div class="brawler-grid-container">
    <!-- Search and filter bar -->
    <div class="filter-bar">
      <v-text-field
        v-model="searchText"
        placeholder="Search brawler..."
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        color="primary"
        style="max-width: 260px;"
      />
      <div class="rarity-chips">
        <v-chip
          v-for="r in rarities"
          :key="r"
          size="small"
          :color="selectedRarities.includes(r) ? getRarityColor(r) : 'default'"
          :variant="selectedRarities.includes(r) ? 'flat' : 'outlined'"
          @click="toggleRarity(r)"
          class="mr-1"
        >{{ r }}</v-chip>
      </div>
      <v-select
        v-model="sortBy"
        :items="['Default', 'A-Z', 'Rarity']"
        label="Sort"
        variant="outlined"
        density="compact"
        hide-details
        style="max-width: 120px;"
      />
    </div>

    <!-- Grid -->
    <div class="brawler-grid">
      <BrawlerCard
        v-for="brawler in filteredBrawlers"
        :key="brawler.bid"
        :brawler="brawler"
        :state="getState(brawler)"
        @click="handleSelect(brawler)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import BrawlerCard from './BrawlerCard.vue'

const props = defineProps({
  brawlers: { type: Array, default: () => [] },
  bannedIds: { type: Array, default: () => [] },
  pickedIds: { type: Array, default: () => [] },
  prePicks: { type: Object, default: () => ({}) },
  softLocks: { type: Object, default: () => ({}) },
  coachRecs: { type: Object, default: () => ({}) },
  currentUserId: { type: String, default: null },
})
const emit = defineEmits(['select'])

const searchText = ref('')
const selectedRarities = ref([])
const sortBy = ref('Default')

const RARITY_COLORS = {
  'Common': '#b9eaff', 'Rare': '#68fd58', 'Super Rare': '#5ab3ff',
  'Epic': '#d84cff', 'Mythic': '#f66e6e', 'Legendary': '#fff11e',
  'Ultra Legendary': '#ff9f1c',
}

const rarities = Object.keys(RARITY_COLORS)

function getRarityColor(r) { return RARITY_COLORS[r] || '#fff' }
function toggleRarity(r) {
  const idx = selectedRarities.value.indexOf(r)
  if (idx === -1) selectedRarities.value.push(r)
  else selectedRarities.value.splice(idx, 1)
}

function matchesSearch(b) {
  const q = searchText.value.toLowerCase().trim()
  if (!q) return true
  if (b.name_en.toLowerCase().includes(q)) return true
  if (b.name_cn && b.name_cn.includes(q)) return true
  const initials = b.name_en.split(' ').map(w => w[0]?.toLowerCase()).join('')
  if (initials.includes(q)) return true
  return false
}

const filteredBrawlers = computed(() => {
  let list = props.brawlers.filter(b => {
    if (!matchesSearch(b)) return false
    if (selectedRarities.value.length > 0 && !selectedRarities.value.includes(b.rarity)) return false
    return true
  })
  if (sortBy.value === 'A-Z') list = [...list].sort((a, b) => a.name_en.localeCompare(b.name_en))
  else if (sortBy.value === 'Rarity') {
    const order = rarities
    list = [...list].sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity))
  }
  return list
})

function getState(brawler) {
  const bid = brawler.bid
  if (props.bannedIds.includes(bid)) return 'banned'
  if (props.pickedIds.includes(bid)) return 'picked'
  for (const coachId in props.coachRecs) {
    const recs = props.coachRecs[coachId]
    if (recs[props.currentUserId] === bid) return 'recommended'
  }
  for (const uid in props.softLocks) {
    if (props.softLocks[uid] === bid) return 'softlocked'
  }
  for (const uid in props.prePicks) {
    if (props.prePicks[uid] === bid) return 'preselected'
  }
  return 'normal'
}

function handleSelect(brawler) {
  if (props.bannedIds.includes(brawler.bid) || props.pickedIds.includes(brawler.bid)) return
  emit('select', brawler)
}
</script>

<style scoped>
.brawler-grid-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #12121e;
  border-radius: 12px;
  overflow: hidden;
}
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #1a1a2e;
  flex-wrap: wrap;
}
.rarity-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.brawler-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px;
  overflow-y: auto;
  flex: 1;
}
</style>
