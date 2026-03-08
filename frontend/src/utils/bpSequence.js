/**
 * Number of bans each team submits simultaneously during the ban phase.
 */
export const BANS_PER_TEAM = 3

/**
 * Returns the 6-step pick sequence (1-2-2-1) used after the simultaneous ban phase.
 * @param {'blue'|'red'} firstPick - the team that picks first
 */
export function getPickSequence(firstPick) {
  const a = firstPick
  const b = a === 'blue' ? 'red' : 'blue'
  return [
    { team: a, type: 'pick' },
    { team: b, type: 'pick' }, { team: b, type: 'pick' },
    { team: a, type: 'pick' }, { team: a, type: 'pick' },
    { team: b, type: 'pick' },
  ]
}

/**
 * Returns the full 12-step BP sequence (6 sequential bans + 6 picks).
 * Kept for backward compatibility — the ban phase now uses simultaneous logic
 * and the store uses getPickSequence for the pick turns.
 * @param {'blue'|'red'} firstPick - the team that picks first
 */
export function getBPSequence(firstPick) {
  const a = firstPick
  const b = a === 'blue' ? 'red' : 'blue'
  return [
    { team: a, type: 'ban' }, { team: b, type: 'ban' },
    { team: a, type: 'ban' }, { team: b, type: 'ban' },
    { team: a, type: 'ban' }, { team: b, type: 'ban' },
    ...getPickSequence(firstPick),
  ]
}
