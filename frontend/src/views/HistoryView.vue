<template>
  <v-container fluid style="background: #0f0f1a; min-height: 100vh; padding: 0;">
    <v-app-bar color="surface" elevation="2">
      <v-btn icon @click="$router.push('/home')"><v-icon>mdi-arrow-left</v-icon></v-btn>
      <v-app-bar-title>Match History</v-app-bar-title>
    </v-app-bar>
    <v-main style="padding-top: 64px;">
      <v-container class="py-6">
        <v-row v-if="loading">
          <v-col class="text-center"><v-progress-circular indeterminate color="primary" /></v-col>
        </v-row>
        <v-row v-else-if="matches.length === 0">
          <v-col class="text-center text-grey">No match history yet.</v-col>
        </v-row>
        <v-row v-else>
          <v-col v-for="match in matches" :key="match.id" cols="12" md="6">
            <v-card style="background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1);" class="mb-4">
              <v-card-title>{{ match.mapName || 'Unknown Map' }}</v-card-title>
              <v-card-subtitle>{{ formatDate(match.created) }}</v-card-subtitle>
              <v-card-text>
                <v-row>
                  <v-col cols="6">
                    <div class="text-info font-weight-bold mb-1">Blue Bans</div>
                    <v-chip v-for="bid in match.blueBans" :key="bid" size="small" class="mr-1 mb-1" color="info" variant="outlined">
                      {{ getBrawlerName(bid) }}
                    </v-chip>
                    <div class="text-info font-weight-bold mb-1 mt-2">Blue Picks</div>
                    <v-chip v-for="bid in match.bluePicks" :key="bid" size="small" class="mr-1 mb-1" color="info">
                      {{ getBrawlerName(bid) }}
                    </v-chip>
                  </v-col>
                  <v-col cols="6">
                    <div class="text-error font-weight-bold mb-1">Red Bans</div>
                    <v-chip v-for="bid in match.redBans" :key="bid" size="small" class="mr-1 mb-1" color="error" variant="outlined">
                      {{ getBrawlerName(bid) }}
                    </v-chip>
                    <div class="text-error font-weight-bold mb-1 mt-2">Red Picks</div>
                    <v-chip v-for="bid in match.redPicks" :key="bid" size="small" class="mr-1 mb-1" color="error">
                      {{ getBrawlerName(bid) }}
                    </v-chip>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import pb from '@/services/pb'
import { useBrawlersStore } from '@/stores/brawlers'

const brawlersStore = useBrawlersStore()
const matches = ref([])
const loading = ref(true)

function getBrawlerName(bid) {
  const b = brawlersStore.getBrawlerById.value(bid)
  return b ? b.name_en : bid
}

function formatDate(d) {
  return new Date(d).toLocaleString()
}

onMounted(async () => {
  try {
    await brawlersStore.loadBrawlers()
    const result = await pb.collection('match_history').getList(1, 50, { sort: '-created' })
    matches.value = result.items
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>
