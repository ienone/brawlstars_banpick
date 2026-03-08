<template>
  <v-card style="background: #1a1a2e;" class="pa-4">
    <v-card-title>Team Seats</v-card-title>
    <v-card-text>
      <v-row>
        <v-col v-for="team in ['blue', 'red']" :key="team" cols="12" md="6">
          <div :class="`text-${team === 'blue' ? 'info' : 'error'} font-weight-bold mb-2 text-h6`">
            {{ team.toUpperCase() }} TEAM
          </div>
          <!-- Players -->
          <div class="mb-3">
            <div class="text-caption mb-1">Players</div>
            <draggable
              :list="localSeats[team].players"
              group="users"
              item-key="id"
              class="drag-zone"
              @change="emitUpdate"
            >
              <template #item="{ element, index }">
                <div class="seat-slot player-slot" :class="`team-${team}`">
                  <v-icon size="16" class="mr-2">mdi-account</v-icon>
                  <span v-if="element.value">{{ getUserName(element.value) }}</span>
                  <span v-else class="text-grey">Player {{ index + 1 }}</span>
                </div>
              </template>
            </draggable>
          </div>
          <!-- Coaches -->
          <div>
            <div class="text-caption mb-1">Coaches</div>
            <draggable
              :list="localSeats[team].coaches"
              group="users"
              item-key="id"
              class="drag-zone"
              @change="emitUpdate"
            >
              <template #item="{ element, index }">
                <div class="seat-slot coach-slot" :class="`team-${team}`">
                  <v-icon size="16" class="mr-2">mdi-whistle</v-icon>
                  <span v-if="element.value">{{ getUserName(element.value) }}</span>
                  <span v-else class="text-grey">Coach {{ index + 1 }}</span>
                </div>
              </template>
            </draggable>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { reactive, watch } from 'vue'
import draggable from 'vuedraggable'

const props = defineProps({
  seats: { type: Object, required: true },
  users: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:seats'])

/**
 * Wrap a plain value array into `{ id, value }` objects so vuedraggable
 * has a stable, unique key per slot even when items are null primitives.
 */
function toKeyedList(arr, prefix) {
  return arr.map((value, i) => ({ id: `${prefix}-${i}`, value }))
}

const localSeats = reactive({
  blue: {
    players: toKeyedList(props.seats.blue?.players || [null, null, null], 'blue-player'),
    coaches: toKeyedList(props.seats.blue?.coaches || [null, null], 'blue-coach'),
  },
  red: {
    players: toKeyedList(props.seats.red?.players || [null, null, null], 'red-player'),
    coaches: toKeyedList(props.seats.red?.coaches || [null, null], 'red-coach'),
  },
})

watch(() => props.seats, (newSeats) => {
  // Update values in-place to preserve the stable id keys
  for (const team of ['blue', 'red']) {
    for (const role of ['players', 'coaches']) {
      const incoming = newSeats[team]?.[role] || []
      localSeats[team][role].forEach((slot, i) => {
        slot.value = incoming[i] ?? null
      })
    }
  }
}, { deep: true })

function getUserName(uid) {
  const u = props.users.find(u => u.id === uid)
  return u ? (u.username || u.name || uid) : uid
}

function emitUpdate() {
  emit('update:seats', {
    blue: {
      players: localSeats.blue.players.map(s => s.value),
      coaches: localSeats.blue.coaches.map(s => s.value),
    },
    red: {
      players: localSeats.red.players.map(s => s.value),
      coaches: localSeats.red.coaches.map(s => s.value),
    },
  })
}
</script>

<style scoped>
.drag-zone {
  min-height: 40px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.seat-slot {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.05);
  cursor: grab;
  min-height: 40px;
}
.seat-slot.team-blue { border-left: 3px solid #5ab3ff; }
.seat-slot.team-red { border-left: 3px solid #f66e6e; }
</style>
