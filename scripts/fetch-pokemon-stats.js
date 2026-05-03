#!/usr/bin/env node
// Fetches base stats, height, weight, and types for every Pokémon we have sprites for,
// then writes frontend/src/pokemonStats.json so the Pokémon Battle game has instant access.

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SPRITE_DIR = join(ROOT, 'frontend/src/assets/pokemon')
const OUT = join(ROOT, 'frontend/src/pokemonStats.json')

const CONCURRENCY = 8
const RETRY_LIMIT = 3
const RETRY_DELAY_MS = 1000

function getIds() {
  return readdirSync(SPRITE_DIR)
    .map(f => f.match(/^poke_(\d+)\.gif$/))
    .filter(Boolean)
    .map(m => parseInt(m[1], 10))
    .sort((a, b) => a - b)
}

async function fetchWithRetry(url, attempt = 1) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    if (attempt >= RETRY_LIMIT) throw err
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt))
    return fetchWithRetry(url, attempt + 1)
  }
}

async function fetchPokemon(id) {
  const data = await fetchWithRetry(`https://pokeapi.co/api/v2/pokemon/${id}`)
  const statsMap = {}
  for (const s of data.stats) statsMap[s.stat.name] = s.base_stat
  return {
    hp: statsMap['hp'] ?? 0,
    attack: statsMap['attack'] ?? 0,
    defense: statsMap['defense'] ?? 0,
    sp_atk: statsMap['special-attack'] ?? 0,
    sp_def: statsMap['special-defense'] ?? 0,
    speed: statsMap['speed'] ?? 0,
    total: Object.values(statsMap).reduce((a, b) => a + b, 0),
    height: data.height,
    weight: data.weight,
    types: data.types.map(t => t.type.name),
  }
}

async function runPool(ids) {
  const results = {}
  const queue = [...ids]
  let done = 0
  const total = ids.length

  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift()
      try {
        results[id] = await fetchPokemon(id)
        done++
        if (done % 50 === 0) process.stdout.write(`  ${done}/${total}\n`)
      } catch (err) {
        console.error(`  Failed #${id}: ${err.message}`)
        results[id] = null
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker())
  await Promise.all(workers)
  return results
}

const ids = getIds()
console.log(`Fetching stats for ${ids.length} Pokémon...`)
const stats = await runPool(ids)
const failed = Object.entries(stats).filter(([, v]) => v === null).map(([k]) => k)
if (failed.length) console.warn(`Warning: ${failed.length} Pokémon failed: ${failed.join(', ')}`)
console.log(`Done. Writing ${OUT}`)
writeFileSync(OUT, JSON.stringify(stats, null, 2))
console.log('Complete.')
