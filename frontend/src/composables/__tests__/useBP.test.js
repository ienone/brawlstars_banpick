import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/pb', () => ({
  default: {
    authStore: { model: null, isValid: false },
    collection: () => ({
      subscribe: vi.fn().mockResolvedValue(vi.fn()),
    }),
  },
}))

vi.mock('@/stores/brawlers', () => ({
  useBrawlersStore: () => ({
    brawlers: [],
    getBrawlerById: { value: () => null },
  }),
}))

describe('useBP composable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('getBPSequence returns 12 steps', async () => {
    const { useBP } = await import('../useBP')
    const { getBPSequence } = useBP()
    const seq = getBPSequence('blue')
    expect(seq).toHaveLength(12)
  })

  it('ban phase is first 6 turns', async () => {
    const { useBP } = await import('../useBP')
    const { getBPSequence } = useBP()
    const seq = getBPSequence('blue')
    for (let i = 0; i < 6; i++) {
      expect(seq[i].type).toBe('ban')
    }
  })

  it('pick phase is turns 6-11', async () => {
    const { useBP } = await import('../useBP')
    const { getBPSequence } = useBP()
    const seq = getBPSequence('blue')
    for (let i = 6; i < 12; i++) {
      expect(seq[i].type).toBe('pick')
    }
  })

  it('blue first pick: ban order is A,B,A,B,A,B', async () => {
    const { useBP } = await import('../useBP')
    const { getBPSequence } = useBP()
    const seq = getBPSequence('blue')
    const banTeams = seq.slice(0, 6).map(s => s.team)
    expect(banTeams).toEqual(['blue', 'red', 'blue', 'red', 'blue', 'red'])
  })

  it('blue first pick: pick order is A,B,B,A,A,B', async () => {
    const { useBP } = await import('../useBP')
    const { getBPSequence } = useBP()
    const seq = getBPSequence('blue')
    const pickTeams = seq.slice(6).map(s => s.team)
    expect(pickTeams).toEqual(['blue', 'red', 'red', 'blue', 'blue', 'red'])
  })

  it('red first pick: ban order is B,A,B,A,B,A', async () => {
    const { useBP } = await import('../useBP')
    const { getBPSequence } = useBP()
    const seq = getBPSequence('red')
    const banTeams = seq.slice(0, 6).map(s => s.team)
    expect(banTeams).toEqual(['red', 'blue', 'red', 'blue', 'red', 'blue'])
  })

  it('currentStep reflects room store turn', async () => {
    const { useRoomStore } = await import('@/stores/room')
    const { useBP } = await import('../useBP')
    const roomStore = useRoomStore()
    roomStore.config.firstPick = 'blue'
    roomStore.bpState.turn = 0
    const { currentStep } = useBP()
    expect(currentStep.value).toEqual({ team: 'blue', type: 'ban' })
  })
})
