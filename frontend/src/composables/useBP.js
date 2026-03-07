import { computed } from 'vue'
import { useRoomStore } from '@/stores/room'

export function useBP() {
  const roomStore = useRoomStore()

  const getBPSequence = (firstPick) => {
    const a = firstPick
    const b = a === 'blue' ? 'red' : 'blue'
    return [
      { team: a, type: 'ban' }, { team: b, type: 'ban' },
      { team: a, type: 'ban' }, { team: b, type: 'ban' },
      { team: a, type: 'ban' }, { team: b, type: 'ban' },
      { team: a, type: 'pick' },
      { team: b, type: 'pick' }, { team: b, type: 'pick' },
      { team: a, type: 'pick' }, { team: a, type: 'pick' },
      { team: b, type: 'pick' },
    ]
  }

  const currentStep = computed(() => {
    const seq = getBPSequence(roomStore.config.firstPick)
    return seq[roomStore.bpState.turn] || null
  })

  const isMyTurn = (userId) => {
    if (!currentStep.value) return false
    const myTeam = getTeamForUser(userId)
    return currentStep.value.team === myTeam
  }

  const getTeamForUser = (userId) => {
    const blue = roomStore.seats.blue
    const red = roomStore.seats.red
    if (blue.players.includes(userId) || blue.coaches.includes(userId)) return 'blue'
    if (red.players.includes(userId) || red.coaches.includes(userId)) return 'red'
    return null
  }

  const canSelect = (userId, brawlerId) => {
    if (!isMyTurn(userId)) return false
    if (roomStore.bannedBrawlerIds.includes(brawlerId)) return false
    if (roomStore.pickedBrawlerIds.includes(brawlerId)) return false
    return true
  }

  return { getBPSequence, currentStep, isMyTurn, canSelect }
}
