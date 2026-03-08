<template>
  <div
    class="bp-slot"
    :class="[`type-${type}`, { 'is-active': isCurrent, 'has-brawler': !!brawler, 'is-masked': masked }]"
    ref="slotEl"
  >
    <!-- Actual brawler content -->
    <div v-if="brawler && !masked" class="slot-brawler" ref="brawlerEl">
      <img :src="brawler.image_url || `/assets/brawlers/${brawler.bid}.webp`" :alt="brawler.name_en" />
      <div class="slot-name">{{ brawler.name_en }}</div>
      <div v-if="type === 'ban'" class="ban-x"><v-icon color="error">mdi-close</v-icon></div>
    </div>
    <!-- Masked: opponent confirmed ban, identity hidden -->
    <div v-else-if="masked" class="slot-masked">
      <v-icon color="error" size="28">mdi-cancel</v-icon>
      <div class="masked-label">已禁用</div>
    </div>
    <!-- Empty slot -->
    <div v-else class="slot-empty">
      <v-icon :color="type === 'ban' ? 'error' : 'primary'" size="28">
        {{ type === 'ban' ? 'mdi-cancel' : 'mdi-sword' }}
      </v-icon>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAnimation } from '@/composables/useAnimation'

const props = defineProps({
  team: String,
  type: { type: String, default: 'pick' },
  index: Number,
  brawler: { type: Object, default: null },
  /** When true, the slot shows a "ban confirmed" indicator without revealing the brawler. */
  masked: { type: Boolean, default: false },
  isActive: Boolean,
  isCurrent: Boolean,
})

const { flipBrawlerIn } = useAnimation()
const brawlerEl = ref(null)

watch(() => props.brawler, (newVal) => {
  if (newVal && !props.masked && brawlerEl.value) {
    flipBrawlerIn(brawlerEl.value)
  }
})
</script>

<style scoped>
.bp-slot {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.2);
  background: rgba(26,26,46,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.type-ban { border-color: rgba(246,110,110,0.4); }
.type-pick { border-color: rgba(76,175,80,0.4); }
.is-active {
  border-color: #4CAF50;
  animation: active-pulse 1.2s ease-in-out infinite;
}
.is-masked {
  border-color: rgba(246,110,110,0.6);
  background: rgba(200,0,0,0.12);
}
@keyframes active-pulse {
  0%, 100% { box-shadow: 0 0 6px #4CAF50; }
  50% { box-shadow: 0 0 18px #4CAF50; }
}
.slot-brawler {
  width: 100%; height: 100%;
  display: flex; flex-direction: column; align-items: center;
}
.slot-brawler img { width: 100%; height: 54px; object-fit: cover; object-position: top; }
.slot-name { font-size: 8px; color: #fff; text-align: center; }
.ban-x { position: absolute; top: 0; right: 0; background: rgba(200,0,0,0.6); border-radius: 0 0 0 8px; }
.slot-masked {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 100%;
  height: 100%;
}
.masked-label {
  font-size: 8px;
  color: rgba(246,110,110,0.8);
  text-align: center;
  letter-spacing: 0.5px;
}
.slot-empty { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
</style>
