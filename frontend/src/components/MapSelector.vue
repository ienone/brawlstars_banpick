<template>
  <v-card style="background: #1a1a2e;" class="pa-4">
    <v-card-title>
      Map Selection
      <v-btn icon size="small" class="ml-2" @click="selectRandom" title="Random map">
        <v-icon>mdi-dice-multiple</v-icon>
      </v-btn>
    </v-card-title>
    <v-card-text>
      <v-text-field
        v-model="searchText"
        placeholder="Search maps..."
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        class="mb-4"
      />
      <div v-if="selectedMap" class="selected-map mb-4">
        <v-chip color="primary" size="large">
          <v-icon start>mdi-map</v-icon>
          {{ selectedMap.name }}
        </v-chip>
      </div>
      <div class="map-grid">
        <v-card
          v-for="map in filteredMaps"
          :key="map.id"
          class="map-card"
          :class="{ selected: modelValue === map.id }"
          @click="$emit('update:modelValue', map.id)"
          variant="outlined"
        >
          <img v-if="map.image_url" :src="map.image_url" :alt="map.name" class="map-img" />
          <div class="map-name">{{ map.name }}</div>
          <div class="map-mode text-caption text-grey">{{ map.mode }}</div>
        </v-card>
      </div>
      <div v-if="filteredMaps.length === 0" class="text-grey text-center py-4">
        No maps available. Maps will be loaded from PocketBase.
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: null },
  maps: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

const searchText = ref('')

const filteredMaps = computed(() => {
  const q = searchText.value.toLowerCase().trim()
  if (!q) return props.maps
  return props.maps.filter(m =>
    m.name?.toLowerCase().includes(q) || m.mode?.toLowerCase().includes(q)
  )
})

const selectedMap = computed(() => props.maps.find(m => m.id === props.modelValue))

function selectRandom() {
  if (props.maps.length === 0) return
  const idx = Math.floor(Math.random() * props.maps.length)
  emit('update:modelValue', props.maps[idx].id)
}
</script>

<style scoped>
.map-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.map-card {
  width: 100px;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.15s, box-shadow 0.15s;
  background: #12121e;
}
.map-card:hover { transform: scale(1.04); }
.map-card.selected { box-shadow: 0 0 12px #4CAF50; border-color: #4CAF50 !important; }
.map-img { width: 100%; height: 70px; object-fit: cover; }
.map-name { font-size: 11px; padding: 4px; text-align: center; color: #fff; }
.map-mode { text-align: center; padding-bottom: 4px; }
.selected-map { display: flex; align-items: center; }
</style>
