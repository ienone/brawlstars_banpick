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
      { bid: '4', name_en: 'Brock', rarity: 'Rare' },
      { bid: '5', name_en: 'Barley', rarity: 'Rare' },
      { bid: '6', name_en: 'Nita', rarity: 'Rare' },
    ],
    getBrawlerById: vi.fn().mockImplementation(id => ({ bid: id, name_en: 'MockBrawler', image_url: '' })),
  }),
}))

describe('room store — BP sequence', () => {
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
})

describe('room store — simultaneous ban phase', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function makeStore() {
    const store = useRoomStore()
    store.config.firstPick = 'blue'
    // Put user1 in blue team, user2 in red team
    store.seats.blue.players = ['user1', null, null]
    store.seats.red.players = ['user2', null, null]
    return store
  }

  it('confirmBan adds brawler to correct team', () => {
    const store = makeStore()
    store.confirmBan('user1', '1')
    expect(store.bpState.simultBans.blue).toContain('1')
    expect(store.bpState.simultBans.red).not.toContain('1')
  })

  it('confirmBan adds to red team for red user', () => {
    const store = makeStore()
    store.confirmBan('user2', '2')
    expect(store.bpState.simultBans.red).toContain('2')
  })

  it('confirmBan clears prePick after confirming', () => {
    const store = makeStore()
    store.setPrePick('user1', '1')
    store.confirmBan('user1', '1')
    expect(store.bpState.prePicks['user1']).toBeUndefined()
  })

  it('confirmBan does not exceed BANS_PER_TEAM', () => {
    const store = makeStore()
    store.confirmBan('user1', '1')
    store.confirmBan('user1', '2')
    store.confirmBan('user1', '3')
    store.confirmBan('user1', '4') // 4th ban should be ignored
    expect(store.bpState.simultBans.blue).toHaveLength(3)
  })

  it('confirmBan does not allow duplicate brawler IDs', () => {
    const store = makeStore()
    store.confirmBan('user1', '1')
    store.confirmBan('user2', '1') // same brawler already banned
    expect(store.bpState.simultBans.red).not.toContain('1')
  })

  it('bannedBrawlerIds reflects all confirmed bans from both teams', () => {
    const store = makeStore()
    store.confirmBan('user1', '1')
    store.confirmBan('user2', '2')
    expect(store.bannedBrawlerIds).toContain('1')
    expect(store.bannedBrawlerIds).toContain('2')
  })

  it('revealBans transitions phase to pick and populates bans array', () => {
    const store = makeStore()
    store.confirmBan('user1', '1')
    store.confirmBan('user2', '4')
    store.revealBans()
    expect(store.bpState.simultBans.revealed).toBe(true)
    expect(store.bpState.phase).toBe('pick')
    expect(store.bpState.turn).toBe(0)
    const allBanIds = store.bpState.bans.map(b => b.brawlerId)
    expect(allBanIds).toContain('1')
    expect(allBanIds).toContain('4')
  })

  it('revealBans is idempotent', () => {
    const store = makeStore()
    store.confirmBan('user1', '1')
    store.revealBans()
    store.revealBans() // second call should not throw or reset state
    expect(store.bpState.simultBans.revealed).toBe(true)
    expect(store.bpState.phase).toBe('pick')
  })

  it('auto-reveals when both teams reach BANS_PER_TEAM', () => {
    const store = makeStore()
    // blue bans 3
    store.confirmBan('user1', '1')
    store.confirmBan('user1', '2')
    store.confirmBan('user1', '3')
    // still in ban phase
    expect(store.bpState.phase).toBe('ban')
    // red bans 3 — should trigger auto-reveal
    store.confirmBan('user2', '4')
    store.confirmBan('user2', '5')
    store.confirmBan('user2', '6')
    expect(store.bpState.phase).toBe('pick')
    expect(store.bpState.simultBans.revealed).toBe(true)
  })

  it('currentTurnInfo is null during ban phase', () => {
    const store = makeStore()
    expect(store.bpState.phase).toBe('ban')
    expect(store.currentTurnInfo).toBeNull()
  })
})

describe('room store — pick phase', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function makeStoreInPickPhase() {
    const store = useRoomStore()
    store.config.firstPick = 'blue'
    store.seats.blue.players = ['user1', null, null]
    store.seats.red.players = ['user2', null, null]
    // Skip ban phase
    store.bpState.phase = 'pick'
    store.bpState.turn = 0
    store.bpState.simultBans = { blue: ['b1', 'b2', 'b3'], red: ['b4', 'b5', 'b6'], revealed: true }
    store.bpState.bans = [
      { team: 'blue', brawlerId: 'b1' }, { team: 'blue', brawlerId: 'b2' }, { team: 'blue', brawlerId: 'b3' },
      { team: 'red', brawlerId: 'b4' }, { team: 'red', brawlerId: 'b5' }, { team: 'red', brawlerId: 'b6' },
    ]
    return store
  }

  it('advanceTurn adds pick correctly', () => {
    const store = makeStoreInPickPhase()
    store.advanceTurn('brawler1')
    expect(store.bpState.turn).toBe(1)
    expect(store.bpState.picks).toHaveLength(1)
    expect(store.bpState.picks[0].team).toBe('blue')
    expect(store.bpState.picks[0].brawlerId).toBe('brawler1')
  })

  it('advanceTurn transitions to finished after 6 picks', () => {
    const store = makeStoreInPickPhase()
    for (let i = 0; i < 6; i++) store.advanceTurn(`brawler${i}`)
    expect(store.bpState.phase).toBe('finished')
    expect(store.bpState.status).toBe('finished')
  })

  it('advanceTurn does nothing during ban phase', () => {
    const store = useRoomStore()
    store.config.firstPick = 'blue'
    expect(store.bpState.phase).toBe('ban')
    store.advanceTurn('brawler1')
    expect(store.bpState.picks).toHaveLength(0)
    expect(store.bpState.turn).toBe(0)
  })

  it('confirmPick advances turn and clears locks', () => {
    const store = makeStoreInPickPhase()
    store.setSoftLock('user1', 'brawler1')
    store.confirmPick('user1', 'brawler1')
    expect(store.bpState.turn).toBe(1)
    expect(store.bpState.softLock['user1']).toBeUndefined()
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

  it('setCoachRec sets coach recommendation', () => {
    const store = useRoomStore()
    store.setCoachRec('coach1', 'player1', 'brawler5')
    expect(store.bpState.coachRecs['coach1']['player1']).toBe('brawler5')
  })
})

describe('room store — getBansForViewer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('own team sees actual brawler (not masked)', () => {
    const store = useRoomStore()
    store.bpState.simultBans.blue = ['1']
    const slots = store.getBansForViewer('blue', 'blue')
    expect(slots[0].masked).toBe(false)
    expect(slots[0].brawlerId).toBe('1')
  })

  it('opponent sees masked slot before reveal', () => {
    const store = useRoomStore()
    store.bpState.simultBans.blue = ['1']
    const slots = store.getBansForViewer('blue', 'red')
    expect(slots[0].masked).toBe(true)
    expect(slots[0].brawlerId).toBeNull()
  })

  it('after reveal, all bans are visible to opponent', () => {
    const store = useRoomStore()
    store.bpState.simultBans.blue = ['1']
    store.bpState.simultBans.revealed = true
    const slots = store.getBansForViewer('blue', 'red')
    expect(slots[0].masked).toBe(false)
    expect(slots[0].brawlerId).toBe('1')
  })

  it('empty slots are null', () => {
    const store = useRoomStore()
    // No bans confirmed yet
    const slots = store.getBansForViewer('blue', 'blue')
    expect(slots[0]).toBeNull()
    expect(slots[1]).toBeNull()
    expect(slots[2]).toBeNull()
  })
})
