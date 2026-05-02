#!/usr/bin/env node
// Fetches abilities and top level-up moves (with power/type/category) for every
// Pokémon that has a sprite, writing frontend/src/pokemonMovesAbilities.json.
//
// Strategy:
//  1. Fetch pokemon/{id} for each Pokémon → grab abilities + level-up move names
//  2. Collect unique move names, fetch move/{name} once each → power/type/category
//  3. For each Pokémon, select up to 4 moves: the highest-power ones, keeping
//     the Pokémon's own type represented where possible.

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = join(__dirname, '..')
const SPRITE_DIR = join(ROOT, 'frontend/src/assets/pokemon')
const OUT        = join(ROOT, 'frontend/src/pokemonMovesAbilities.json')

const CONCURRENCY  = 10
const RETRY_LIMIT  = 3
const RETRY_DELAY  = 800

function getSpriteIds() {
  return readdirSync(SPRITE_DIR)
    .map(f => f.match(/^poke_(\d+)\.gif$/))
    .filter(Boolean)
    .map(m => parseInt(m[1], 10))
    .sort((a, b) => a - b)
}

async function fetchWithRetry(url, attempt = 1) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`)
    return await res.json()
  } catch (err) {
    if (attempt >= RETRY_LIMIT) throw err
    await new Promise(r => setTimeout(r, RETRY_DELAY * attempt))
    return fetchWithRetry(url, attempt + 1)
  }
}

async function runPool(items, fn, label) {
  const results = {}
  const queue   = [...items]
  let done = 0
  const total = items.length

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()
      try {
        results[item] = await fn(item)
      } catch (err) {
        console.error(`  Failed ${item}: ${err.message}`)
        results[item] = null
      }
      done++
      if (done % 100 === 0 || done === total)
        process.stdout.write(`  ${label}: ${done}/${total}\n`)
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
  return results
}

// ── Step 1: fetch each Pokémon's abilities + level-up move names ──────────────
console.log('Step 1: Fetching Pokémon data...')
const ids = getSpriteIds()

const pokeData = await runPool(ids, async (id) => {
  const data = await fetchWithRetry(`https://pokeapi.co/api/v2/pokemon/${id}`)
  const abilities = data.abilities
    .sort((a, b) => a.slot - b.slot)
    .map(a => a.ability.name.replace(/-/g, ' '))

  const levelUpMoves = data.moves
    .filter(m => m.version_group_details.some(v => v.move_learn_method.name === 'level-up'))
    .map(m => m.move.name)

  return { abilities, levelUpMoves }
}, 'pokémon')

// ── Step 2: collect unique move names and fetch each once ─────────────────────
console.log('\nStep 2: Fetching move details...')
const uniqueMoveNames = new Set()
for (const pd of Object.values(pokeData)) {
  if (pd) pd.levelUpMoves.forEach(n => uniqueMoveNames.add(n))
}
console.log(`  ${uniqueMoveNames.size} unique moves to fetch`)

const moveDetails = await runPool([...uniqueMoveNames], async (name) => {
  const data = await fetchWithRetry(`https://pokeapi.co/api/v2/move/${encodeURIComponent(name)}`)
  const power    = data.power          // null if status/non-damaging
  const type     = data.type.name
  const category = data.damage_class.name  // 'physical' | 'special' | 'status'
  const pp       = data.pp
  // Friendly display name: capitalise each word, replace hyphens with spaces
  const displayName = name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return { name: displayName, power, type, category, pp }
}, 'moves')

// ── Step 3: build final per-Pokémon records ───────────────────────────────────
console.log('\nStep 3: Building final records...')
const output = {}

for (const id of ids) {
  const pd = pokeData[id]
  if (!pd) continue

  const abilities = pd.abilities

  // Gather damaging level-up moves with known power
  const damagingMoves = pd.levelUpMoves
    .map(name => moveDetails[name])
    .filter(m => m && m.power !== null && m.power > 0 && m.category !== 'status')

  // De-duplicate by display name (same move can appear via multiple version groups)
  const seen = new Set()
  const unique = damagingMoves.filter(m => {
    if (seen.has(m.name)) return false
    seen.add(m.name); return true
  })

  // Sort by power descending, take top 4
  const top4 = unique
    .sort((a, b) => b.power - a.power)
    .slice(0, 4)

  // Fallback: if fewer than 4 moves found, add generic Tackle
  while (top4.length < 4) {
    top4.push({ name: 'Tackle', power: 40, type: 'normal', category: 'physical', pp: 35 })
  }

  output[id] = { abilities, moves: top4 }
}

const failed = ids.filter(id => !output[id])
if (failed.length) console.warn(`\nWarning: ${failed.length} Pokémon missing data`)

writeFileSync(OUT, JSON.stringify(output, null, 2))
console.log(`\nDone. Wrote ${Object.keys(output).length} Pokémon to ${OUT}`)
