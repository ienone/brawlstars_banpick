import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import pb from '@/services/pb'
import { useBrawlersStore } from './brawlers'
import { getBPSequence, getPickSequence, BANS_PER_TEAM } from '@/utils/bpSequence'

function generateInviteCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .substring(0, 6)
    .toUpperCase()
}

function getNextSeatIndex(picks, team) {
  return picks.filter(p => p.team === team).length
}

export const useRoomStore = defineStore('room', () => {
  const id = ref(null)
  const hostId = ref(null)
  const inviteCode = ref(null)
  const config = ref({ bo: 3, globalBP: true, mapId: null, firstPick: 'blue' })
  const seats = ref({
    blue: { players: [null, null, null], coaches: [null, null] },
    red: { players: [null, null, null], coaches: [null, null] },
  })
  const bpState = ref({
    turn: 0,
    phase: 'ban',
    // Simultaneous ban phase — populated before reveal, then transferred to bans[]
    simultBans: {
      blue: [],       // confirmed brawler IDs by blue team
      red: [],        // confirmed brawler IDs by red team
      revealed: false, // true when both teams done or forced by timeout
    },
    bans: [],         // populated from simultBans after reveal; used in pick phase / history
    picks: [],
    prePicks: {},     // per-userId pre-selection (used as pre-ban or pre-pick)
    softLock: {},     // per-userId soft lock (pick phase only)
    coachRecs: {},
    timer: 30,
    status: 'waiting',
  })
  const historyLocks = ref([])
  let unsubscribeFn = null

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getUserTeam(userId) {
    if (!userId) return null
    const blue = seats.value.blue
    const red = seats.value.red
    if (blue.players.includes(userId) || blue.coaches.includes(userId)) return 'blue'
    if (red.players.includes(userId) || red.coaches.includes(userId)) return 'red'
    return null
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  /**
   * Current turn info — only meaningful during pick phase.
   * Returns null during the simultaneous ban phase.
   */
  const currentTurnInfo = computed(() => {
    if (bpState.value.phase !== 'pick') return null
    const seq = getPickSequence(config.value.firstPick)
    return seq[bpState.value.turn] || null
  })

  const isBanPhase = computed(() => bpState.value.phase === 'ban')
  const isPickPhase = computed(() => bpState.value.phase === 'pick')

  /** All confirmed ban IDs from both teams (used to disable brawlers in the grid). */
  const bannedBrawlerIds = computed(() => {
    const { blue = [], red = [] } = bpState.value.simultBans || {}
    return [...blue, ...red]
  })

  const pickedBrawlerIds = computed(() => bpState.value.picks.map(p => p.brawlerId))

  const availableBrawlers = computed(() => {
    const brawlersStore = useBrawlersStore()
    const banned = bannedBrawlerIds.value
    const picked = pickedBrawlerIds.value
    return brawlersStore.brawlers.filter(b => !banned.includes(b.bid) && !picked.includes(b.bid))
  })

  const currentTeam = computed(() => currentTurnInfo.value?.team || null)

  // ── Ban-phase actions ─────────────────────────────────────────────────────

  /**
   * Called when a player confirms their ban selection during the simultaneous ban phase.
   * - Adds the brawler to the team's confirmed list (up to BANS_PER_TEAM).
   * - Clears the player's prePick.
   * - Auto-reveals when both teams have all bans confirmed.
   */
  function confirmBan(userId, brawlerId) {
    if (bpState.value.phase !== 'ban') return
    const team = getUserTeam(userId)
    if (!team) return
    const teamBans = bpState.value.simultBans[team]
    if (teamBans.length >= BANS_PER_TEAM) return
    if (bannedBrawlerIds.value.includes(brawlerId)) return // already banned
    teamBans.push(brawlerId)
    delete bpState.value.prePicks[userId]
    // Auto-reveal when both teams reach the cap
    const { blue, red } = bpState.value.simultBans
    if (blue.length >= BANS_PER_TEAM && red.length >= BANS_PER_TEAM) {
      revealBans()
    }
  }

  /**
   * Reveals all bans (called when both teams finish, or on timeout).
   * Transitions the phase to 'pick'.
   */
  function revealBans() {
    if (bpState.value.simultBans.revealed) return // idempotent
    bpState.value.simultBans.revealed = true
    // Transfer simultBans to the legacy bans[] array for pick-phase display / history
    bpState.value.bans = [
      ...bpState.value.simultBans.blue.map(id => ({ team: 'blue', brawlerId: id })),
      ...bpState.value.simultBans.red.map(id => ({ team: 'red', brawlerId: id })),
    ]
    bpState.value.phase = 'pick'
    bpState.value.turn = 0
    bpState.value.prePicks = {}
  }

  /**
   * Returns ban display objects for a given team, filtered by the viewer's perspective.
   * - Own team's bans: show actual brawler object.
   * - Opponent's bans (before reveal): return masked placeholder objects.
   * - After reveal: all bans are shown.
   * @param {'blue'|'red'} targetTeam  which team's bans to describe
   * @param {'blue'|'red'|null} viewerTeam  which team is viewing
   */
  function getBansForViewer(targetTeam, viewerTeam) {
    const brawlersStore = useBrawlersStore()
    const { blue = [], red = [], revealed = false } = bpState.value.simultBans
    const confirmedIds = targetTeam === 'blue' ? blue : red
    const showActual = revealed || targetTeam === viewerTeam

    // Build an array of BANS_PER_TEAM slot objects
    const slots = []
    for (let i = 0; i < BANS_PER_TEAM; i++) {
      if (i < confirmedIds.length) {
        if (showActual) {
          const brawlerObj = brawlersStore.getBrawlerById(confirmedIds[i])
          slots.push({ brawlerId: confirmedIds[i], brawlerObj, masked: false })
        } else {
          // Opponent sees "ban confirmed" indicator without knowing the brawler
          slots.push({ brawlerId: null, brawlerObj: null, masked: true })
        }
      } else {
        slots.push(null) // empty slot
      }
    }
    return slots
  }

  // ── Pick-phase actions ────────────────────────────────────────────────────

  /** Advances the pick phase by one turn. Only valid during pick phase. */
  function advanceTurn(brawlerId) {
    if (bpState.value.phase !== 'pick') return
    const seq = getPickSequence(config.value.firstPick)
    const info = seq[bpState.value.turn]
    if (!info) return

    bpState.value.picks.push({
      team: info.team,
      brawlerId,
      seatIndex: getNextSeatIndex(bpState.value.picks, info.team),
    })
    bpState.value.turn++

    if (bpState.value.turn >= getPickSequence(config.value.firstPick).length) {
      bpState.value.phase = 'finished'
      bpState.value.status = 'finished'
    }
  }

  function setPrePick(userId, brawlerId) {
    bpState.value.prePicks[userId] = brawlerId
  }

  function setSoftLock(userId, brawlerId) {
    bpState.value.softLock[userId] = brawlerId
  }

  function confirmPick(userId, brawlerId) {
    advanceTurn(brawlerId)
    delete bpState.value.prePicks[userId]
    delete bpState.value.softLock[userId]
  }

  function setCoachRec(coachId, targetUserId, brawlerId) {
    if (!bpState.value.coachRecs[coachId]) {
      bpState.value.coachRecs[coachId] = {}
    }
    bpState.value.coachRecs[coachId][targetUserId] = brawlerId
  }

  // ── PocketBase sync ───────────────────────────────────────────────────────

  async function subscribeRoom(roomId) {
    if (unsubscribeFn) {
      unsubscribeFn()
      unsubscribeFn = null
    }
    unsubscribeFn = await pb.collection('rooms').subscribe(roomId, (e) => {
      if (e.action === 'update') {
        updateRoomFromRecord(e.record)
      }
    })
  }

  function updateRoomFromRecord(record) {
    if (record.config) config.value = { ...config.value, ...record.config }
    if (record.seats) seats.value = record.seats
    if (record.bpState) bpState.value = { ...bpState.value, ...record.bpState }
    if (record.hostId) hostId.value = record.hostId
    if (record.inviteCode) inviteCode.value = record.inviteCode
  }

  async function createRoom(cfg) {
    try {
      const data = {
        hostId: pb.authStore.model?.id,
        config: cfg || config.value,
        seats: seats.value,
        bpState: bpState.value,
        status: 'waiting',
        inviteCode: generateInviteCode(),
      }
      const record = await pb.collection('rooms').create(data)
      id.value = record.id
      hostId.value = record.hostId
      inviteCode.value = record.inviteCode
      if (record.config) config.value = record.config
      return record
    } catch (e) {
      console.error('createRoom error', e)
      throw e
    }
  }

  async function joinRoom(inviteCode) {
    try {
      const records = await pb.collection('rooms').getList(1, 1, {
        filter: `inviteCode = "${inviteCode}"`,
      })
      if (records.items.length === 0) throw new Error('Room not found')
      const record = records.items[0]
      id.value = record.id
      updateRoomFromRecord(record)
      return record
    } catch (e) {
      console.error('joinRoom error', e)
      throw e
    }
  }

  async function startBP() {
    bpState.value.status = 'active'
    bpState.value.phase = 'ban'
    bpState.value.turn = 0
    bpState.value.simultBans = { blue: [], red: [], revealed: false }
    bpState.value.bans = []
    bpState.value.picks = []
    bpState.value.prePicks = {}
    bpState.value.softLock = {}
    bpState.value.coachRecs = {}
    if (id.value) {
      try {
        await pb.collection('rooms').update(id.value, { bpState: bpState.value })
      } catch (e) {
        console.error('startBP update error', e)
      }
    }
  }

  function updateSeats(newSeats) {
    seats.value = newSeats
  }

  function unsubscribe() {
    if (unsubscribeFn) {
      unsubscribeFn()
      unsubscribeFn = null
    }
  }

  return {
    id, hostId, inviteCode, config, seats, bpState, historyLocks,
    currentTurnInfo, isBanPhase, isPickPhase,
    bannedBrawlerIds, pickedBrawlerIds, availableBrawlers, currentTeam,
    BANS_PER_TEAM,
    getBPSequence,
    getUserTeam,
    advanceTurn, setPrePick, setSoftLock, confirmPick, setCoachRec, updateSeats,
    confirmBan, revealBans, getBansForViewer,
    subscribeRoom, createRoom, joinRoom, startBP, unsubscribe,
  }
})
