import { computed } from 'vue'
import { useRoomStore } from '@/stores/room'
import { getBPSequence, BANS_PER_TEAM } from '@/utils/bpSequence'

export function useBP() {
  const roomStore = useRoomStore()

  /**
   * Current step — null during the simultaneous ban phase;
   * returns the active pick step during pick phase.
   */
  const currentStep = computed(() => roomStore.currentTurnInfo)

  const getTeamForUser = (userId) => roomStore.getUserTeam(userId)

  const isMyTurn = (userId) => {
    if (!currentStep.value) return false
    return currentStep.value.team === getTeamForUser(userId)
  }

  /** Whether a player can still confirm a ban during the simultaneous ban phase. */
  const canBan = (userId) => {
    if (roomStore.bpState.phase !== 'ban') return false
    const team = getTeamForUser(userId)
    if (!team) return false
    const teamBans = roomStore.bpState.simultBans?.[team] ?? []
    return teamBans.length < BANS_PER_TEAM
  }

  const canSelect = (userId, brawlerId) => {
    if (roomStore.bannedBrawlerIds.includes(brawlerId)) return false
    if (roomStore.pickedBrawlerIds.includes(brawlerId)) return false
    if (roomStore.bpState.phase === 'ban') return canBan(userId)
    return isMyTurn(userId)
  }

  return { getBPSequence, currentStep, isMyTurn, canBan, canSelect }
}
