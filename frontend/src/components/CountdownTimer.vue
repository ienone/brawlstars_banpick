<template>
  <div class="timer-wrap" ref="timerEl">
    <svg viewBox="0 0 80 80" width="80" height="80">
      <circle cx="40" cy="40" r="34" fill="none" stroke="#1a1a2e" stroke-width="8" />
      <circle
        cx="40" cy="40" r="34" fill="none"
        :stroke="timerColor"
        stroke-width="8"
        stroke-linecap="round"
        stroke-dasharray="213.6"
        :stroke-dashoffset="dashOffset"
        transform="rotate(-90 40 40)"
        style="transition: stroke-dashoffset 0.9s linear, stroke 0.5s;"
      />
      <text x="40" y="46" text-anchor="middle" :fill="timerColor" font-size="22" font-weight="bold">
        {{ seconds }}
      </text>
    </svg>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useAnimation } from '@/composables/useAnimation'

const props = defineProps({
  seconds: { type: Number, default: 30 },
  isActive: { type: Boolean, default: false },
  maxSeconds: { type: Number, default: 30 },
})
const emit = defineEmits(['timeout'])

const { countdownShake } = useAnimation()
const timerEl = ref(null)
// Guard so we emit 'timeout' exactly once per countdown cycle.
// Resets automatically when seconds becomes positive again (next round).
const hasTimedOut = ref(false)

const timerColor = computed(() => {
  const ratio = props.seconds / props.maxSeconds
  if (ratio > 0.5) return '#68fd58'
  if (ratio > 0.2) return '#FF9800'
  return '#f66e6e'
})

const dashOffset = computed(() => {
  const ratio = props.seconds / props.maxSeconds
  return 213.6 * (1 - ratio)
})

watch(() => props.seconds, (s) => {
  if (s > 0) {
    hasTimedOut.value = false
    if (s <= 5 && timerEl.value) {
      countdownShake(timerEl.value)
    }
  } else if (!hasTimedOut.value) {
    hasTimedOut.value = true
    emit('timeout')
  }
})
</script>

<style scoped>
.timer-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
