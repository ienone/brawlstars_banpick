import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRoomStore } from '../room'

vi.mock('@/services/pb', () => ({
  default: {
    authStore: { model: { id: 'user1' }, isValid: false },
    collection: () => ({
      subscribe: vi.fn().mockResolvedValue(vi.fn()),
      unsubscribe: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: 'room1', hostId: 'user1', config: {}, seats: {}, bpState: {} }),
      update: vi.fn().mockResolvedValue({}),
      getList: vi.fn().mockResolvedValue({ items: [] }),
    }),
  },
}))

vi.mock('../brawlers', () => ({
  useBrawlersStore: () => ({
    brawlers: [
      { bid: '1', name_en: 'Shelly', rarity: 'Common' },
      { bid: '2', name_en: 'Colt', rarity: 'Common' },
      { bid: '3', name_en: 'Bull', rarity: 'Common' },
    ],
    getBrawlerById: { value: (id) => null },
  }),
}))

describe('room store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('generates correct BP sequence for blue first pick', () => {
    const store = useRoomStore()
    const seq = store.getBPSequence('blue')
    expect(seq).toHaveLength(12)
    expect(seq[0]).toEqual({ team: 'blue', type: 'ban' })
    expect(seq[1]).toEqual({ team: 'red', type: 'ban' })
    expect(seq[5]).toEqual({ team: 'red', type: 'ban' })
    expect(seq[6]).toEqual({ team: 'blue', type: 'pick' })
    expect(seq[7]).toEqual({ team: 'red', type: 'pick' })
    expect(seq[8]).toEqual({ team: 'red', type: 'pick' })
    expect(seq[9]).toEqual({ team: 'blue', type: 'pick' })
    expect(seq[10]).toEqual({ team: 'blue', type: 'pick' })
    expect(seq[11]).toEqual({ team: 'red', type: 'pick' })
  })

  it('generates correct BP sequence for red first pick', () => {
    const store = useRoomStore()
    const seq = store.getBPSequence('red')
    expect(seq[0]).toEqual({ team: 'red', type: 'ban' })
    expect(seq[1]).toEqual({ team: 'blue', type: 'ban' })
    expect(seq[6]).toEqual({ team: 'red', type: 'pick' })
    expect(seq[7]).toEqual({ team: 'blue', type: 'pick' })
  })

  it('advances turn correctly on ban', () => {
    const store = useRoomStore()
    store.config.firstPick = 'blue'
    store.advanceTurn('brawler1')
    expect(store.bpState.turn).toBe(1)
    expect(store.bpState.bans).toHaveLength(1)
    expect(store.bpState.bans[0].team).toBe('blue')
    expect(store.bpState.bans[0].brawlerId).toBe('brawler1')
  })

  it('transitions from ban to pick phase at turn 6', () => {
    const store = useRoomStore()
    store.config.firstPick = 'blue'
    for (let i = 0; i < 6; i++) {
      store.advanceTurn(`brawler${i}`)
    }
    expect(store.bpState.phase).toBe('pick')
    expect(store.bpState.turn).toBe(6)
    expect(store.bpState.bans).toHaveLength(6)
  })

  it('transitions to finished at turn 12', () => {
    const store = useRoomStore()
    store.config.firstPick = 'blue'
    for (let i = 0; i < 12; i++) {
      store.advanceTurn(`brawler${i}`)
    }
    expect(store.bpState.phase).toBe('finished')
    expect(store.bpState.status).toBe('finished')
  })

  it('setPrePick sets prePicks correctly', () => {
    const store = useRoomStore()
    store.setPrePick('user1', 'brawler1')
    expect(store.bpState.prePicks['user1']).toBe('brawler1')
  })

  it('setSoftLock sets softLock correctly', () => {
    const store = useRoomStore()
    store.setSoftLock('user1', 'brawler2')
    expect(store.bpState.softLock['user1']).toBe('brawler2')
  })

  it('confirmPick advances turn and clears locks', () => {
    const store = useRoomStore()
    store.config.firstPick = 'blue'
    store.bpState.phase = 'pick'
    store.bpState.turn = 6
    store.setSoftLock('user1', 'brawler1')
    store.confirmPick('user1', 'brawler1')
    expect(store.bpState.turn).toBe(7)
    expect(store.bpState.softLock['user1']).toBeUndefined()
  })

  it('setCoachRec sets coach recommendation', () => {
    const store = useRoomStore()
    store.setCoachRec('coach1', 'player1', 'brawler5')
    expect(store.bpState.coachRecs['coach1']['player1']).toBe('brawler5')
  })

  it('bannedBrawlerIds computed returns correct ids', () => {
    const store = useRoomStore()
    store.config.firstPick = 'blue'
    store.advanceTurn('b1')
    store.advanceTurn('b2')
    expect(store.bannedBrawlerIds).toContain('b1')
    expect(store.bannedBrawlerIds).toContain('b2')
  })
})
