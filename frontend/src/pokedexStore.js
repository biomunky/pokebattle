const KEY = 'poke-trumps-dex-v1'

export const STARTERS = [1, 4, 7] // Bulbasaur, Charmander, Squirtle

export function loadDex() {
  try {
    const raw = localStorage.getItem(KEY)
    return new Set(raw ? JSON.parse(raw).map(Number) : [])
  } catch { return new Set() }
}

function saveDex(dex) {
  try { localStorage.setItem(KEY, JSON.stringify([...dex])) } catch {}
}

export function catchPokemon(...ids) {
  const dex = loadDex()
  let changed = false
  for (const id of ids) {
    if (!dex.has(id)) { dex.add(id); changed = true }
  }
  if (changed) saveDex(dex)
}

export function getDexCount() {
  return loadDex().size
}

// Battle roster = starters + everything in the dex
export function loadRoster() {
  const dex = loadDex()
  return [...new Set([...STARTERS, ...[...dex]])]
}

export function isStarter(id) {
  return STARTERS.includes(Number(id))
}

// Called on battle loss — removes specific IDs from the dex (starters are always kept)
export function releasePokemon(ids) {
  const dex = loadDex()
  for (const id of ids) {
    if (!STARTERS.includes(Number(id))) dex.delete(Number(id))
  }
  saveDex(dex)
}
