<template>
  <div
    class="brawler-card"
    :class="[`state-${state}`, { 'is-banned': state === 'banned', 'is-active': state === 'softlocked' || state === 'preselected' }]"
    :style="cardStyle"
    @click="handleClick"
    ref="cardEl"
  >
    <img
      :src="brawler.image_url || `/assets/brawlers/${brawler.bid}.webp`"
      :alt="brawler.name_en"
      class="brawler-img"
      loading="lazy"
    />
    <div v-if="state === 'banned'" class="ban-overlay">
      <v-icon color="error" size="36">mdi-close-circle</v-icon>
    </div>
    <div v-if="state === 'recommended'" class="rec-badge">
      <v-icon size="14" color="warning">mdi-star</v-icon>
    </div>
    <div class="brawler-name">{{ brawler.name_en }}</div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import { useAnimation } from '@/composables/useAnimation'

const props = defineProps({
  brawler: { type: Object, required: true },
  state: { type: String, default: 'normal' },
})
const emit = defineEmits(['click'])

const { flipBrawlerIn, shimmerEffect } = useAnimation()
const cardEl = ref(null)
let shimmerTl = null

const RARITY_COLORS = {
  'Common': '#b9eaff',
  'Rare': '#68fd58',
  'Super Rare': '#5ab3ff',
  'Epic': '#d84cff',
  'Mythic': '#f66e6e',
  'Legendary': '#fff11e',
  'Ultra Legendary': '#ff9f1c',
}

const rarityColor = computed(() => RARITY_COLORS[props.brawler.rarity] || '#ffffff')

const cardStyle = computed(() => {
  const base = { '--rarity-color': rarityColor.value }
  if (props.state === 'banned') return { ...base, filter: 'grayscale(1)', opacity: '0.5' }
  if (props.state === 'softlocked') return { ...base, boxShadow: `0 0 14px ${rarityColor.value}` }
  if (props.state === 'recommended') return { ...base, boxShadow: '0 0 14px #FFD700' }
  return base
})

watch(() => props.state, (newState, oldState) => {
  if (newState === 'picked' && cardEl.value) {
    flipBrawlerIn(cardEl.value)
  }
  if (newState === 'preselected' && cardEl.value) {
    shimmerTl = shimmerEffect(cardEl.value)
  } else if (oldState === 'preselected' && shimmerTl) {
    shimmerTl.kill()
    shimmerTl = null
  }
})

onUnmounted(() => { if (shimmerTl) shimmerTl.kill() })

function handleClick() {
  if (props.state !== 'banned' && props.state !== 'picked') {
    emit('click', props.brawler)
  }
}
</script>

<style scoped>
.brawler-card {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  border: 2px solid var(--rarity-color, #fff);
  background: #1a1a2e;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.15s, box-shadow 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.brawler-card:hover:not(.is-banned) {
  transform: scale(1.05);
}
.brawler-img {
  width: 100%;
  height: 64px;
  object-fit: cover;
  object-position: top;
}
.brawler-name {
  font-size: 9px;
  text-align: center;
  line-height: 1.1;
  padding: 0 2px;
  color: #fff;
  background: rgba(0,0,0,0.6);
  width: 100%;
}
.ban-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(200,0,0,0.3);
}
.rec-badge {
  position: absolute;
  top: 2px;
  right: 2px;
}
.state-softlocked {
  animation: pulse-border 1s ease-in-out infinite;
}
@keyframes pulse-border {
  0%, 100% { box-shadow: 0 0 6px var(--rarity-color); }
  50% { box-shadow: 0 0 18px var(--rarity-color); }
}
</style>
