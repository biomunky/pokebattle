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
      _dex = new Set(data.pokemon_ids.map(Number))
    } catch {
      _dex = _loadFromStorage()
    }
  } else {
    _dex = _loadFromStorage()
  }

  // Ensure starters are always present
  let changed = false
  for (const id of STARTERS) {
    if (!_dex.has(id)) { _dex.add(id); changed = true }
  }
  if (changed) {
    _saveToStorage(_dex)
    if (backendMode && username) {
      catchPokemonAPI(username, STARTERS).catch(() => {})
    }
  }

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
  if (_dex !== null) return _dex
  return _loadFromStorage()
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
