/**
 * Returns the 12-step BP sequence for a given first-pick team.
 * Ban Phase (6 bans, 1-1-1-1-1-1): [A, B, A, B, A, B]  (turns 0-5)
 * Pick Phase (6 picks, 1-2-2-1):   [A, B, B, A, A, B]  (turns 6-11)
 * @param {'blue'|'red'} firstPick - the team that picks first
 */
export function getBPSequence(firstPick) {
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
