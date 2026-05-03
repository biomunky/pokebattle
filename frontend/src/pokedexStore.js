import { getPokedex, catchPokemonAPI, releasePokemonAPI } from './api'

const STORAGE_PREFIX = 'pokebattle-dex-v1'
export const STARTERS = [1, 4, 7]

// Module-level session state — set once on login, then used by all sync functions.
let _username = null
let _backendMode = false
let _dex = null  // in-memory cache; null means not yet initialised

// Call once after login. Loads the dex from backend or localStorage and caches it.
export async function initDex(username, backendMode) {
  _username = username
  _backendMode = backendMode

  if (backendMode) {
    try {
      const data = await getPokedex(username)
      const backendSet = new Set(data.pokemon_ids.map(Number))
      const localSet = _loadFromStorage()
      // Merge: backend is authoritative for releases (deleted items won't be in
      // localStorage since releasePokemon always saves there first), but preserve
      // anything caught locally that failed to sync to the backend.
      _dex = new Set([...backendSet, ...localSet])
      const localOnly = [...localSet].filter(id => !backendSet.has(id))
      if (localOnly.length > 0) {
        catchPokemonAPI(username, localOnly).catch(() => {})
      }
    } catch {
      _dex = _loadFromStorage()
    }
  } else {
    _dex = _loadFromStorage()
  }

  // Ensure starters are always present
  const missing = STARTERS.filter(id => !_dex.has(id))
  if (missing.length > 0) {
    for (const id of missing) _dex.add(id)
    if (backendMode && username) {
      catchPokemonAPI(username, STARTERS).catch(() => {})
    }
  }
  // Always write back so localStorage matches the merged in-memory state
  _saveToStorage(_dex)

  return _dex
}

function _storageKey() {
  return _username ? `${STORAGE_PREFIX}-${_username}` : STORAGE_PREFIX
}

function _loadFromStorage() {
  try {
    const raw = localStorage.getItem(_storageKey())
    return new Set(raw ? JSON.parse(raw).map(Number) : [])
  } catch {
    return new Set()
  }
}

function _saveToStorage(dex) {
  try { localStorage.setItem(_storageKey(), JSON.stringify([...dex])) } catch {}
}

export function loadDex() {
  const dex = _dex !== null ? _dex : _loadFromStorage()
  // Starters are always owned — guarantee them even if module state was reset
  for (const id of STARTERS) dex.add(id)
  return dex
}

export function catchPokemon(...ids) {
  const dex = loadDex()
  const newIds = []
  for (const id of ids) {
    if (!dex.has(id)) { dex.add(id); newIds.push(id) }
  }
  if (newIds.length > 0) {
    _saveToStorage(dex)
    if (_backendMode && _username) {
      catchPokemonAPI(_username, newIds).catch(() => {})
    }
  }
}

export function releasePokemon(ids) {
  const dex = loadDex()
  const released = []
  for (const id of ids) {
    if (!STARTERS.includes(Number(id))) {
      dex.delete(Number(id))
      released.push(id)
    }
  }
  _saveToStorage(dex)
  if (_backendMode && _username && released.length > 0) {
    releasePokemonAPI(_username, released).catch(() => {})
  }
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

export function resetStore() {
  _username = null
  _backendMode = false
  _dex = null
}
