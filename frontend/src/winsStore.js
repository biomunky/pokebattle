import { getPokemonWins } from './api'

const STORAGE_PREFIX = 'pokebattle-wins-v1'

let _username = null
let _backendMode = false
let _wins = null  // Map<pokemonId (number), wins (number)>

export async function initWins(username, backendMode) {
  _username = username
  _backendMode = backendMode

  if (backendMode) {
    try {
      const data = await getPokemonWins(username)
      _wins = new Map(data.wins.map(({ pokemon_id, wins }) => [Number(pokemon_id), Number(wins)]))
    } catch {
      _wins = _loadFromStorage()
    }
  } else {
    _wins = _loadFromStorage()
  }
}

function _storageKey() {
  return _username ? `${STORAGE_PREFIX}-${_username}` : STORAGE_PREFIX
}

function _loadFromStorage() {
  try {
    const raw = localStorage.getItem(_storageKey())
    if (!raw) return new Map()
    return new Map(
      Object.entries(JSON.parse(raw)).map(([k, v]) => [Number(k), Number(v)])
    )
  } catch {
    return new Map()
  }
}

function _saveToStorage() {
  if (_wins === null) return
  try {
    localStorage.setItem(_storageKey(), JSON.stringify(Object.fromEntries(_wins)))
  } catch {}
}

export function getWins(pokemonId) {
  if (_wins === null) return 0
  return _wins.get(Number(pokemonId)) ?? 0
}

export function resetWinsStore() {
  _username = null
  _backendMode = false
  _wins = null
}

// Increments wins for each Pokémon in the list.
// Returns array of { pokemonId, wins } for those that just crossed a 10-win milestone.
export function addWins(pokemonIds) {
  if (_wins === null) _wins = new Map()
  const milestones = []
  for (const id of pokemonIds) {
    const prev = _wins.get(Number(id)) ?? 0
    const next = prev + 1
    _wins.set(Number(id), next)
    if (next % 10 === 0) milestones.push({ pokemonId: Number(id), wins: next })
  }
  _saveToStorage()
  return milestones
}
