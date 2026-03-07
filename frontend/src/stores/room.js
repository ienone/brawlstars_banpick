import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import pb from '@/services/pb'
import { useBrawlersStore } from './brawlers'

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
    bans: [],
    picks: [],
    prePicks: {},
    softLock: {},
    coachRecs: {},
    timer: 30,
    status: 'waiting',
  })
  const historyLocks = ref([])
  let unsubscribeFn = null

  const currentTurnInfo = computed(() => {
    const seq = getBPSequence(config.value.firstPick)
    return seq[bpState.value.turn] || null
  })

  const isBanPhase = computed(() => bpState.value.phase === 'ban')
  const isPickPhase = computed(() => bpState.value.phase === 'pick')

  const bannedBrawlerIds = computed(() => bpState.value.bans.map(b => b.brawlerId))
  const pickedBrawlerIds = computed(() => bpState.value.picks.map(p => p.brawlerId))

  const availableBrawlers = computed(() => {
    const brawlersStore = useBrawlersStore()
    const banned = bannedBrawlerIds.value
    const picked = pickedBrawlerIds.value
    return brawlersStore.brawlers.filter(b => !banned.includes(b.bid) && !picked.includes(b.bid))
  })

  const currentTeam = computed(() => currentTurnInfo.value?.team || null)

  function advanceTurn(brawlerId) {
    const info = currentTurnInfo.value
    if (!info) return
    const turn = bpState.value.turn

    if (info.type === 'ban') {
      bpState.value.bans.push({ team: info.team, brawlerId })
    } else {
      bpState.value.picks.push({ team: info.team, brawlerId, seatIndex: bpState.value.picks.filter(p => p.team === info.team).length })
    }

    bpState.value.turn++

    if (bpState.value.turn >= 6 && bpState.value.phase === 'ban') {
      bpState.value.phase = 'pick'
    }
    if (bpState.value.turn >= 12) {
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
        inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
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
    getBPSequence,
    advanceTurn, setPrePick, setSoftLock, confirmPick, setCoachRec,
    subscribeRoom, createRoom, joinRoom, startBP, unsubscribe,
  }
})
